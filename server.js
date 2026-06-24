const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');

let GoogleGenAI;
try {
    const genai = require('@google/genai');
    GoogleGenAI = genai.GoogleGenAI;
} catch (e) {
    try {
        const googleGenai = require('@google/generative-ai');
        GoogleGenAI = googleGenai.GoogleGenAI;
    } catch (err) {
        console.error("SDK initialization warning: Ensure @google/genai package is installed.");
    }
}

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
            return res.status(500).json({ error: "Missing API Key token environment configuration." });
        }

        const { imageBase64, prompt } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: "No image payload source data detected." });
        }

        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

        if (!GoogleGenAI) {
            throw new Error("Google Gen AI SDK package initialization failed on start registry.");
        }

        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        console.log("Transmitting data handshakes to model pipelines...");

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                prompt || "Perform a detailed botanical and ethnobotanical analysis of this plant specimen.",
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: cleanBase64
                    }
                }
            ],
        });

        return res.json({ text: response.text });

    } catch (error) {
        console.error("--- ACTIVE SERVER ERROR LOG ---");
        console.error(error);
        console.error("--------------------------------");
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
