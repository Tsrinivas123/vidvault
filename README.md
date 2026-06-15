<div align="center">
  <img width="1200" height="475" alt="VidVault Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
  
  # 🌌 VidVault: AI-Powered Media Hub
  
  [![Python Backend](https://img.shields.io/badge/Backend-Python%20%7C%20Flask-blue.svg?style=for-the-badge&logo=python&logoColor=white)](https://flask.palletsprojects.com/)
  [![Google Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-red.svg?style=for-the-badge&logo=google-gemini&logoColor=white)](https://ai.google.dev/)
  [![Vanilla Frontend](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JS-orange.svg?style=for-the-badge&logo=javascript&logoColor=white)](#)
  [![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](#)

  **VidVault** is a next-generation, high-performance YouTube Video and Audio Downloader designed with premium dark-space aesthetics, dynamic micro-animations, and integrated **Google Gemini AI** to generate instant SEO metadata (optimized titles, viral hashtags, and engaging descriptions) for creators.
</div>

---

## ✨ Features

- **🚀 High-Speed Downloads**: Instantly download video (up to 1080p/4K) and audio (up to 320kbps MP3) streams.
- **🧠 Gemini AI SEO Generator**: Automatically generate optimized titles, viral description templates, and trending hashtags for YouTube search optimization.
- **🛡️ Auto-Cookie Fallback**: Bypasses YouTube's strict bot detection locks gracefully:
  - Automatically extracts cookies from your local browser (Chrome/Edge).
  - Clean fallback chain to download publicly accessible videos without cookies if browser locks are encountered.
  - Supports custom `cookies.txt` import.
- **📦 Smart Format Handlers**: If `ffmpeg` is not installed on the system, the server automatically queries and merges audio-video streams or provides pre-merged streams directly.
- **🧹 Auto-Cleanup Loop**: Background daemon thread automatically cleans up downloads older than 1 hour to prevent disk space leaks.

---

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, CSS3 Custom Tokens, CSS Grid/Flexbox Layout, and Modern Vanilla JavaScript (state management, progress bars, API integrations).
- **Backend**: Python 3.x, Flask, `flask-cors`.
- **Extraction Engine**: `yt-dlp` (High-performance YouTube Extractor).
- **AI Engine**: `google-genai` (Google Gemini 2.5 Flash API).
- **Styling Philosophy**: Custom space-themed dark mode UI with glassmorphism, responsive grids, CSS variables, Google Fonts (`Outfit`), and micro-animations.

---

## 💻 Getting Started Locally

### Prerequisites
- [Python 3.8+](https://www.python.org/downloads/)
- [FFmpeg](https://ffmpeg.org/download.html) (Highly recommended for merging high-quality streams)

### 1. Clone & Set Up Directory
Navigate to the directory and install python backend dependencies:
```bash
# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173

# Your Gemini API Key from Google AI Studio
GEMINI_API_KEY=your_gemini_api_key_here

# Browser to extract cookies from to bypass YouTube "Sign in to confirm you're not a bot" checks:
# Options: chrome, edge, firefox, opera, safari, brave, vivaldi
YT_COOKIES_FROM_BROWSER=chrome
```

### 3. Run the App
Start the Flask server locally:
```bash
python backend/app.py
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser!

---

## 🔐 Resolving YouTube Bot Verification Checks
If you hit YouTube's `"Sign in to confirm you're not a bot"` rate limits or blocks:

### Option A: The Microsoft Edge Workaround (Easiest)
Since browsers lock their cookie databases when open, you can't read Chrome's cookies if you are running the app inside Chrome:
1. Open **Microsoft Edge**.
2. Visit `http://127.0.0.1:5000`.
3. **Close Google Chrome completely** (ensure no background Chrome processes are running).
4. Paste the video link and click **Download Video**. It will bypass the lock instantly!

### Option B: The `cookies.txt` File
1. Install the Chrome extension **Get cookies.txt LOCALLY**.
2. Go to YouTube, open the extension, and export/download your cookies as a text file.
3. Rename the file to **`cookies.txt`** and save it directly in the `backend/` directory.
4. Keep all browsers open and download freely!

---

## 🚀 Deployment

### Backend (Render / Railway / VPS)
The server contains a `render-build.sh` script to set up environment dependencies. Make sure to define the following Environment Variables in your deployment dashboard:
- `GEMINI_API_KEY`
- `PORT` (usually set automatically by hosting providers)

### Git Repository
This code is deploy-ready. Push directly to your main branch:
```bash
git add .
git commit -m "VidVault Production Ready"
git push origin main
```

---

## 📄 License
This project is licensed under the MIT License.
