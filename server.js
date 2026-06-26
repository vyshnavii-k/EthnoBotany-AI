const express = require('express');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fieldSize: 50 * 1024 * 1024, fileSize: 50 * 1024 * 1024 }
});

app.use(express.static(__dirname));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Simple mock database for users and comments (Resets if server restarts)
const users = []; 
const publicFeed = [];

// 1. REGISTRATION ENDPOINT (Enforces unique usernames)
app.post('/api/register', (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // Check if username already exists
  const userExists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (userExists) {
    return res.status(400).json({ error: "Username is already taken." });
  }

  // Save user object
  users.push({ email, username, password });
  res.json({ success: true, message: "Registration successful!", username });
});

// 2. SCAN PLANT ENDPOINT (Gated: Requires logged-in username header)
app.post('/api/scan', upload.single('image'), async (req, res) => {
  try {
    const loggedInUser = req.headers['x-user-auth'];
    if (!loggedInUser) {
      return res.status(401).json({ error: "Access denied. Please log in first to scan plants." });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing API Key configuration token." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded." });
    }

    const base64Image = req.file.buffer.toString('base64');
    const promptText = "Analyze this plant. Provide clear paragraphs without markdown styling elements like asterisks, hashtags, or bullet formatting labels.";
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const fetch = (await import('node-fetch')).default;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
            parts: [
                { text: promptText },
                { inline_data: { mime_type: req.file.mimetype, data: base64Image } }
            ]
        }]
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      let analysisText = data.candidates[0].content.parts[0].text;
      
      // Clean out any leftover raw markdown symbols from the text output
      analysisText = analysisText.replace(/[#*`_-]/g, '').trim();

      res.json({ result: analysisText });
    } else {
      res.status(500).json({ error: "Unexpected response format from Google API." });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server processing exception: " + error.message });
  }
});

// 3. POST TO FEED ENDPOINT (Gated: Requires logged-in username)
app.post('/api/feed/post', (req, res) => {
  const loggedInUser = req.headers['x-user-auth'];
  const { imageData, description } = req.body;

  if (!loggedInUser) {
    return res.status(401).json({ error: "Please log in to share to the community board." });
  }

  const newPost = {
    id: Date.now(),
    username: loggedInUser,
    image: imageData,
    description: description,
    comments: []
  };

  publicFeed.unshift(newPost);
  res.json({ success: true, feed: publicFeed });
});

// 4. ADD COMMENT ENDPOINT (Gated: Requires logged-in username)
app.post('/api/feed/comment', (req, res) => {
  const loggedInUser = req.headers['x-user-auth'];
  const { postId, text } = req.body;

  if (!loggedInUser) {
    return res.status(401).json({ error: "Please log in to post comments." });
  }

  const post = publicFeed.find(p => p.id === Number(postId));
  if (!post) return res.status(404).json({ error: "Post not found." });

  post.comments.push({ username: loggedInUser, text });
  res.json({ success: true, feed: publicFeed });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Listening at port: ${PORT}`));
