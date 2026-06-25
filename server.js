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

    // Standard OpenRouter Base64 string preparation
    const base64Image = req.file.buffer.toString('base64');

    const promptText = "Analyze this botanical image. Identify the plant family, common names, ethno-medicinal uses, and care advice.";

    const fetch = (await import('node-fetch')).default;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.GEMINI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-11b-vision-instruct:free",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              {
                type: "image_url",
                image_url: {
                  url: `data:${req.file.mimetype};base64,${base64Image}`
                }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    console.log("OpenRouter Core Log:", JSON.stringify(data));
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      res.json({ result: data.choices[0].message.content });
    } else if (data.error) {
      res.status(500).json({ error: data.error.message || "OpenRouter engine error." });
    } else {
      res.status(500).json({ error: "Unexpected response format from API model." });
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
