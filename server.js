const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post('/api/analyze', async (req, res) => {
    try {
        if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === "") {
            console.error("CRITICAL: GEMINI_API_KEY environment variable is empty or uninitialized.");
            return res.status(500).json({ error: "Missing API Key configuration token." });
        }

        const { imageBase64, prompt } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: "No image payload source data detected." });
        }

        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        console.log("Transmitting content request handshakes to gemini-2.5-flash...");

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: cleanBase64
                    }
                },
                prompt || "Perform a detailed botanical and ethnobotanical analysis of this plant specimen."
            ],
        });

        console.log("Analysis generation successful!");
        return res.json({ text: response.text });

    } catch (error) {
        console.error("--- SYSTEM API EXECUTOR EXCEPTION ---");
        console.error(error.message);
        console.error(error);
        console.error("--------------------------------------");
        return res.status(500).json({ 
            error: "The AI analysis pipeline encountered an error processing your query.",
            details: error.message 
        });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  Secure System Framework Initialized Live!          `);
    console.log(`  Listening at communication port interface: ${PORT} `);
    console.log(`====================================================`);
});
