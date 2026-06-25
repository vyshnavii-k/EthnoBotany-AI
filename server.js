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


// Main scan endpoint using OpenRouter
app.post('/api/scan', upload.single('image'), async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "Missing API Key configuration token." });
        }
        if (!req.file) {
            return res.status(400).json({ error: "No image file uploaded." });
        }

        // Convert upload buffer directly to a standard base64 data URI format
        const base64Image = req.file.buffer.toString('base64');
        const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

        const promptText = "Analyze this botanical image. Identify the plant family, common names, ethno-medicinal uses, and key active compounds. Return a clean formatted summary layout.";

        // Dynamic import to support the native fetch pattern cleanly
        const fetch = (await import('node-fetch')).default;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemini-2.5-flash", 
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: promptText },
                            { type: "image_url", image_url: { url: dataUrl } }
                        ]
                    }
                ]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            return res.status(500).json({ error: data.error.message || "OpenRouter engine error." });
        }

        const analysisText = data.choices[0].message.content;
        res.json({ result: analysisText });

    } catch (error) {
        console.error("System Execution Exception:", error);
        res.status(500).json({ error: "Internal server processing error." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`Secure System Framework Initialized Live!`);
    console.log(`Listening at communication port interface: ${PORT}`);
    console.log(`========================================`);
});
