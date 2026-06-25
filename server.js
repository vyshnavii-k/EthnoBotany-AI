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

app.post('/api/scan', upload.single('image'), async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing API Key configuration token." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded." });
    }

    const base64Image = req.file.buffer.toString('base64');
    const promptText = "Analyze this botanical image. Identify the plant family, common names, ethno-medicinal uses, and care advice.";
    
    // Direct Google Gemini API endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const fetch = (await import('node-fetch')).default;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
            parts: [
                { text: promptText },
                {
                    inline_data: {
                        mime_type: req.file.mimetype,
                        data: base64Image
                    }
                }
            ]
        }]
      })
    });

    const data = await response.json();
    
    // Google API response structure parsing
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      res.json({ result: data.candidates[0].content.parts[0].text });
    } else if (data.error) {
      res.status(500).json({ error: data.error.message || "Google API engine error." });
    } else {
      res.status(500).json({ error: "Unexpected response format from Google API." });
    }

  } catch (error) {
    console.error("System Core Error:", error);
    res.status(500).json({ error: "Internal core processing exception: " + error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Listening at port: ${PORT}`);
});
