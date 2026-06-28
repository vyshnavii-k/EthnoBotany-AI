# 🌿 EthnoBotany AI

A full-stack, mobile-first web application that democratizes botanical exploration using AI. Users can scan plants using their camera, get instant AI-powered identification and ethnomedicinal insights, ask botanical questions via a chatbot, and share discoveries on a public community board.

🔗 **Live Demo:** [ethno-botany-ai.onrender.com](https://ethno-botany-ai.onrender.com)

---

## ✨ Features

### 🔬 Multimodal Botanical Scanner
- Snap a live photo or upload an image to identify any plant instantly
- Powered by **Google Gemini 2.5 Flash** (multimodal vision)
- Returns plant family, common name, ethnomedicinal properties, and care habits
- **Smart Validation Gate:** If a non-plant object is uploaded (shoe, car, etc.), the AI actively blocks processing and returns a clean error — no junk results

### 🤖 EthnoBotany Chatbot
- Dedicated chat interface for natural language botanical queries
- Ask about plant care, herbal remedies, or species characteristics
- Communicates asynchronously with the backend Gemini API route
- Strips raw markdown for a clean, readable dialogue experience

### 🌐 Community Board
- Public feed where users can share plant discoveries
- Each post includes: username, plant image, AI-generated description, and expandable comments
- Clean card layout — no raw markdown symbols, fully formatted output
- **Auth Gate:** Viewing is public; posting and commenting require a logged-in session

### 🔐 User Authentication
- Email, username, and password registration
- Session-based authorization that protects community posting
- Unauthenticated users are smoothly redirected to the login view

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5, CSS3, Mobile-Responsive Flexbox |
| Backend | Node.js (v20+), Express.js |
| AI Engine | Google Gemini 2.5 Flash (via Google AI Studio API) |
| Image Handling | Multer (in-memory buffer streaming) |
| Deployment | Render |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v20+
- A Google AI Studio API key ([Get one here](https://aistudio.google.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/vyshnavii-k/EthnoBotany-AI.git
cd EthnoBotany-AI

# Install dependencies
npm install

# Create a .env file and add your API key
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start the server
node server.js
```

Then open `http://localhost:3000` in your browser.

---

## 📁 Project Structure

```
EthnoBotany-AI/
├── index.html       # Main frontend UI
├── style.css        # Mobile-first responsive styles
├── server.js        # Express backend + Gemini API routes
├── package.json     # Dependencies
└── .env             # API keys (not committed)
```

---

## 🌱 Why I Built This

Ethnobotany — the study of how cultures use plants medicinally — is rich knowledge that's often locked behind academic paywalls or hard-to-navigate databases. This app makes that knowledge instantly accessible to anyone with a smartphone and a plant in front of them.

---

## 📄 License

MIT License — feel free to use, modify, and build on this project.

---

*Built by [Vyshnavi K](https://github.com/vyshnavii-k) — B.Tech CSE (AI & ML), 2nd Year*
