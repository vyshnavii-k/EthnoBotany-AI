const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const app = express();
const PORT = process.env.PORT || 3000;

// Set high parser thresholds to safely stream high-resolution mobile camera inputs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;


let secureUserStore = []; 
let marketplacePlants = [
    { id: "p1", name: "Neem Plant (Azadirachta indica)", price: 150, location: "Green Earth Nursery, Kudlu", careInterval: 2 },
    { id: "p2", name: "Aloe Vera", price: 80, location: "BioGarden Hub, Kudlu", careInterval: 3 },
    { id: "p3", name: "Tulsi (Holy Basil)", price: 50, location: "Natures Own Store, Kerala", careInterval: 1 }
];
let userReminders = [];

// --- MULTIMODAL AI VISION WITH HIGH-AVAILABILITY POOL ---
app.post('/api/ai/analyze-plant', async (req, res) => {
    const { imageBuffer, requestType } = req.body; 
    if (!imageBuffer) return res.status(400).json({ error: "Missing image buffer payload parameters." });

    // Active model collection tiers to cycle through if a cluster gets rate-throttled
    const modelCluster = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
    
    let systemPrompt = requestType === 'DIAGNOSE_HEALTH' 
        ? "You are an expert plant pathologist. Analyze this plant image. Provide a precise, natural response containing the common name, specific disease diagnosis, severity, and step-by-step organic remedies. Strictly do not use any asterisks (*) or hash signs (#) anywhere in your text response."
        : "You are an expert ethnobotanist. Identify this plant variant. Provide a natural response containing its common name, scientific name, distinct health advantages, traditional indigenous uses, and a practical local recipe. Strictly do not use any asterisks (*) or hash signs (#) anywhere in your text response.";

    for (let model of modelCluster) {
        try {
            console.log(`Routing vision transaction down cluster node: ${model}`);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt }, { inline_data: { mime_type: "image/jpeg", data: imageBuffer } }] }]
                })
            });

            const apiData = await response.json();
            if (apiData.error) {
                console.warn(`Layer [${model}] throttled: ${apiData.error.message}`);
                continue;
            }
            if (!apiData.candidates || !apiData.candidates[0]) continue;

            return res.json({ resultText: apiData.candidates[0].content.parts[0].text });
        } catch (err) { 
            console.error(`Exception handled on layer [${model}]:`, err.message); 
        }
    }
    res.status(503).json({ error: "All public API pipelines are currently throttled by Google. Please wait a few moments and try scanning again." });
});

// --- CORE CHATBOT DIALOGUE ENGINE ---
app.post('/api/ai/chatbot', async (req, res) => {
    const { message } = req.body;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: `You are a helpful plant care assistant bot. Answer concisely without stars or hash characters: ${message}` }] }] })
        });
        const apiData = await response.json();
        res.json({ reply: apiData.candidates[0].content.parts[0].text });
    } catch { 
        res.json({ reply: "Core AI chatbot router currently offline." }); 
    }
});

// --- LOCAL STORAGE SECURE AUTHENTICATION ENDPOINTS ---
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "Fill out all input fields." });
    if (secureUserStore.find(u => u.email === email)) return res.status(400).json({ error: "Email already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);
    secureUserStore.push({ username, email, password: hashedPassword });
    res.json({ message: "Registration completed successfully!" });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = secureUserStore.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ error: "Invalid login credentials." });
    }
    res.json({ username: user.username });
});

app.get('/api/marketplace', (req, res) => res.json(marketplacePlants));
app.get('/api/reminders', (req, res) => res.json(userReminders));
app.post('/api/reminders', (req, res) => {
    const { plantName, intervalDays } = req.body;
    const newReminder = { id: 'r-' + Date.now(), plantName, intervalDays };
    userReminders.push(newReminder);
    res.status(201).json(newReminder);
});

app.listen(PORT, () => console.log(`Secure System Framework initialized at http://localhost:${PORT}`));

