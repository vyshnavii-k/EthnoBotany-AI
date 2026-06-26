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

const users = []; 
const publicFeed = [];

// 1. REGISTER NEW USER
app.post('/api/register', (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) return res.status(400).json({ error: "All fields are required." });

  const userExists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (userExists) return res.status(400).json({ error: "Username is already taken." });

  users.push({ email, username, password });
  res.json({ success: true, message: "Account created successfully!", username });
});

// 2. SCAN AND ANALYZE PLANT (WITH BOTANICAL VALIDATION GATE)
app.post('/api/scan', upload.single('image'), async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Missing API Key configuration token." });
    if (!req.file) return res.status(400).json({ error: "No image file uploaded." });

    const base64Image = req.file.buffer.toString('base64');
    
    // Strict prompt instruction enforcing plant screening
    const promptText = "First, evaluate if this image contains a plant, leaf, flower, tree, seed, or fruit. If the image does NOT contain a plant or botanical specimen, reply EXACTLY with this text: 'Validation Error: This does not look like a plant specimen. Please upload an image of a plant or leaf.' If it IS a plant, proceed to provide a detailed description identifying the plant family, common names, ethno-medicinal uses, and care advice without using markdown syntax, asterisks, or hash characters.";
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: req.file.mimetype, data: base64Image } }] }]
      })
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      let analysisText = data.candidates[0].content.parts[0].text;
      analysisText = analysisText.replace(/[#*`_-]/g, '').trim();

      // Check if the image failed the botanical validation gate
      if (analysisText.includes("Validation Error:")) {
        return res.status(400).json({ error: analysisText.replace("Validation Error:", "").trim() });
      }

      res.json({ result: analysisText });
    } else {
      res.status(500).json({ error: "Unexpected content payload format." });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal processing exception: " + error.message });
  }
});

// 3. BOTANICAL CHATBOT ENDPOINT (Exposing direct system error messages)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message content cannot be blank." });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Missing API Key configuration." });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `You are an expert Ethnobotany AI assistant. Answer this plant or botanical question clearly without using any markdown characters, asterisks, or hashtags: ${message}` }] }]
      })
    });

    const data = await response.json();
    console.log("Chat API Response Log:", JSON.stringify(data));

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      let replyText = data.candidates[0].content.parts[0].text;
      replyText = replyText.replace(/[#*`_-]/g, '').trim();
      res.json({ reply: replyText });
    } else if (data.error) {
      res.status(500).json({ error: `Google Error: ${data.error.message}` });
    } else {
      res.status(500).json({ error: "Unexpected response structure from text engine." });
    }
  } catch (error) {
    res.status(500).json({ error: "Chat processing exception: " + error.message });
  }
});

// 4. RETRIEVE CURRENT PUBLIC FEED
app.get('/api/feed', (req, res) => res.json({ feed: publicFeed }));

// 5. PUBLISH TO BOARD FEED
app.post('/api/feed/post', (req, res) => {
  const loggedInUser = req.headers['x-user-auth'];
  const { imageData, description } = req.body;
  if (!loggedInUser) return res.status(401).json({ error: "Please log in first." });

  const newPost = { id: Date.now(), username: loggedInUser, image: imageData, description, comments: [] };
  publicFeed.unshift(newPost);
  res.json({ success: true, feed: publicFeed });
});

// 6. POST COMMENT
app.post('/api/feed/comment', (req, res) => {
  const loggedInUser = req.headers['x-user-auth'];
  const { postId, text } = req.body;
  if (!loggedInUser) return res.status(401).json({ error: "Please log in first." });

  const post = publicFeed.find(p => p.id === Number(postId));
  if (!post) return res.status(404).json({ error: "Post not found." });

  post.comments.push({ username: loggedInUser, text });
  res.json({ success: true, feed: publicFeed });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Listening at port: ${PORT}`));
