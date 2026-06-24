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

// Adjusted endpoint to match frontend fetch route verbatim
app.post('/api/ai/analyze-plant', async (req, res) => {
    try {
        if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === "") {
            console.error("CRITICAL: GEMINI_API_KEY environment variable is empty.");
            return res.status(500).json({ error: "Missing API Key configuration token." });
        }

        // Catch 'imageBuffer' and 'requestType' coming from script.js
        const { imageBuffer, requestType } = req.body;
        if (!imageBuffer) {
            return res.status(400).json({ error: "No image payload source data detected." });
        }

        const cleanBase64 = imageBuffer.replace(/^data:image\/\w+;base64,/, "");

        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        
        // Define dynamic prompt instructions based on the mode the user clicked
        const systemPrompt = requestType === 'SCAN' 
            ? "Perform a detailed botanical and ethnobotanical analysis of this plant specimen." 
            : "Analyze this plant specimen for plant diseases, nutrient deficiencies, or health problems, and provide treatment recommendations.";

        console.log(`Transmitting request (${requestType}) to gemini-2.5-flash...`);

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: cleanBase64
                    }
                },
                systemPrompt
            ],
        });

        console.log("Analysis generation successful!");
        // Return matching result key format expected by frontend layout wrapper
        return res.json({ resultText: response.text });

    } catch (error) {
        console.error("--- SYSTEM API EXECUTOR EXCEPTION ---");
        console.error(error.message);
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
