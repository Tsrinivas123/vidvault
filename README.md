# ⚡ VidVault - Next-Gen High-Speed YouTube Downloader

VidVault is a modern, high-performance YouTube video and audio downloader built with **React 19**, **Vite**, **TailwindCSS**, and a **Python (Flask + yt-dlp + FFmpeg)** backend.

It features a cyberpunk-themed UI, real-time download speed & progress tracking, universal Windows Media Player compatibility, and AI-powered video insights.

---

## ✨ Features

- 🎥 **Full HD & 4K Downloads:** Download videos in **4K (2160p)**, **2K (1440p)**, **1080p**, **720p**, **480p**, and **360p**.
- 🎵 **High-Quality Audio:** Extract pure audio in **MP3 (320kbps, 192kbps, 128kbps)** or native lossless **M4A (AAC)**.
- ⚡ **Maximum Download Speed:** Multi-threaded fragment downloads (`concurrent_fragment_downloads`) and chunked stream transfer (`http_chunk_size`) to prevent bandwidth throttling.
- 🎬 **Zero-Re-encode Fast Merging:** Uses FFmpeg stream-copy (`-c copy`) to merge video and audio in seconds without CPU burning.
- 🛡️ **100% Windows Compatible:** Automatically formats video to **H.264 (avc1) + AAC**, preventing Windows Media Player `0x80070002` playback errors.
- 📊 **Real-Time Live Progress:** Displays accurate download percentage, speed in **MB/s**, and estimated time remaining (**ETA**).
- 🤖 **Gemini AI Insights:** Automatically generates SEO-optimized titles, video summaries, and viral tags.

---

## 📋 Prerequisites

Before running the project, make sure you have the following installed on your computer:

1. **Node.js** (v18 or higher) - [Download Node.js](https://nodejs.org/)
2. **Python** (v3.10 or higher) - [Download Python](https://www.python.org/) *(Make sure to check "Add Python to PATH" during installation)*
3. **FFmpeg** (Required for combining HD video & audio streams) - [Download FFmpeg](https://ffmpeg.org/download.html)
   - *Quick Windows install via winget:*
     ```powershell
     winget install Gyan.FFmpeg
     ```
   - *Or verify it is installed:*
     ```bash
     ffmpeg -version
     ```

---

## 🚀 Quick Start (Run in 3 Simple Steps)

### Step 1: Install Python Backend Dependencies
Open your terminal in the project folder and run:
```bash
pip install -r backend/requirements.txt
```

### Step 2: Install Frontend Dependencies
In the same project folder, run:
```bash
npm install
```

### Step 3: Run the Application

You need two terminal windows running at the same time:

#### 🟢 Terminal 1 (Start the Backend):
```bash
python backend/app.py
```
> *Backend will start at: `http://127.0.0.1:5000`*

#### 🔵 Terminal 2 (Start the Frontend):
```bash
npm run dev
```
> *Frontend will start at: `http://localhost:3000`*

Open **[http://localhost:3000](http://localhost:3000)** in your web browser. That's it! 🎉

---

## 🍪 YouTube Cookies (Recommended for Reliable Downloads)

YouTube occasionally blocks server or automated requests with `"Sign in to confirm you're not a bot"`.

To bypass this without any issues:

1. Install a free browser extension like **[Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)** (for Chrome/Edge/Brave) or similar for Firefox.
2. Open YouTube while logged in to your account.
3. Click the extension and export your cookies as **`cookies.txt`**.
4. Place the exported `cookies.txt` file into the `backend/` directory:
   ```text
   vidvault/
   └── backend/
       └── cookies.txt   <-- Place it here
   ```
5. Restart your backend server. VidVault will automatically use your cookies!

---

## 📁 Project Structure

```text
vidvault/
├── backend/
│   ├── app.py             # Flask API server & yt-dlp download pipeline
│   ├── requirements.txt   # Python dependencies (Flask, yt-dlp, etc.)
│   ├── cookies.txt        # Optional YouTube cookies for bot bypass
│   ├── downloads/         # Completed video & audio files
│   └── temp/              # Temporary download staging area
├── src/
│   ├── components/
│   │   ├── Hero.tsx       # Main UI: video player, resolution buttons & progress
│   │   ├── Navbar.tsx     # Navigation bar
│   │   └── Footer.tsx     # Footer component
│   ├── services/
│   │   └── youtubeService.ts # API client for polling progress & downloading
│   ├── App.tsx            # Root React component
│   └── main.tsx           # React DOM entry point
├── package.json           # Node.js dependencies & scripts
├── vite.config.ts         # Vite configuration with proxy to backend
└── README.md              # Documentation
```

---

## 🛠️ Common Troubleshooting

### 1. "FFmpeg is not recognized as an internal or external command"
- Install FFmpeg and add its `bin` folder to your system's Environment Variables `PATH`.
- Verify by opening a new terminal and typing `ffmpeg -version`.

### 2. "Sign in to confirm you're not a bot" or "Requested format is not available"
- Export fresh YouTube cookies into `backend/cookies.txt` as described in the [Cookies section](#-youtube-cookies-recommended-for-reliable-downloads).

### 3. "Port 5000 or 3000 already in use"
- Close any previous Python or Node terminal sessions, or change the port in `vite.config.ts` / `backend/app.py`.

---

## 📜 License

This project is created for educational and personal use. Please respect YouTube's Terms of Service and content creators' copyright policies.

