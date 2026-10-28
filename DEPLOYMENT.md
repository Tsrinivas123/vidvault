# VidVault Production Deployment Guide

This guide provides step-by-step instructions to deploy VidVault with:
- **Frontend:** Hosted on **Vercel** (Fast global CDN for React + Vite)
- **Backend:** Hosted on **Render** (as a **Docker Web Service** or Python Web Service) or **Railway** (supporting Python, yt-dlp, FFmpeg, and Node.js)

---

## 1. Architecture Overview

```
[ User Browser ]
       │
       ├── 1. Loads UI Assets from Vercel (https://vidvault.vercel.app)
       │
       └── 2. API Requests & Downloads to Backend (https://vidvault-api.onrender.com)
                 ├── /api/video-info  (Inspects video & extracts 4K/1080p formats)
                 ├── /api/download    (Downloads streams, merges via FFmpeg, serves MP4)
                 └── /api/download/status/<id> (Real-time % & speed polling)
```

---

## 2. Backend Deployment (Render or Railway)

The backend requires **Python 3.11+**, **FFmpeg** (for stream multiplexing), and **Node.js** (for YouTube JavaScript cipher decryption).

### Option A: Render via Docker (Recommended — Most Reliable)
Deploying via Docker guarantees that FFmpeg and Node.js are pre-installed in the container.

1. Go to **[Render Dashboard](https://dashboard.render.com/)** and click **New + $\rightarrow$ Web Service**.
2. Connect your GitHub repository: `https://github.com/Tsrinivas123/vidvault`.
3. Configure the service settings:
   - **Name:** `vidvault-api` (or your preferred name)
   - **Region:** Choose the region closest to you (e.g., Singapore, Frankfurt, Oregon)
   - **Environment:** **Docker** *(Render detects the root `Dockerfile` automatically)*
   - **Plan:** Free (or Starter)
4. Under **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `PORT` | `5000` | Render maps its external port to this |
   | `FRONTEND_URL` | `https://your-frontend.vercel.app` | Your Vercel frontend URL (add after Vercel deployment) |
   | `GEMINI_API_KEY` | `AIzaSy...` | (Optional) Your Google Gemini API Key for SEO Insights |
   | `YT_COOKIES` | *(Contents of cookies.txt)* | (Optional) Paste contents of your exported `cookies.txt` to bypass bot checks |
5. Click **Create Web Service**.
6. Once deployed, note your backend URL: e.g., `https://vidvault-api.onrender.com`.

---

### Option B: Render via Native Python (Alternative)
If you prefer not to use Docker:
- **Environment:** **Python 3**
- **Build Command:** `chmod +x backend/render-build.sh && ./backend/render-build.sh`
- **Start Command:** `gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 300 backend.app:app`

---

## 3. Frontend Deployment (Vercel)

The frontend is a Vite + React SPA that connects to your deployed backend.

### Step-by-Step Vercel Setup:

1. Go to **[Vercel Dashboard](https://vercel.com/dashboard)** and click **Add New... $\rightarrow$ Project**.
2. Import your GitHub repository: `Tsrinivas123/vidvault`.
3. Configure the build settings:
   - **Framework Preset:** **Vite**
   - **Root Directory:** `./` (leave default)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Expand **Environment Variables** and add:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_URL` | `https://vidvault-api.onrender.com` | **Your Render backend URL without trailing slash** |
5. Click **Deploy**.
6. When Vercel finishes, note your production frontend URL: e.g. `https://vidvault.vercel.app`.

---

## 4. Connect Frontend and Backend

Once both are deployed:

1. Copy your Vercel URL (e.g. `https://vidvault.vercel.app`).
2. Go to your **Render Web Service Dashboard $\rightarrow$ Environment**.
3. Set `FRONTEND_URL` to your Vercel URL:
   ```text
   FRONTEND_URL=https://vidvault.vercel.app
   ```
4. Click **Save Changes**. Render will automatically redeploy with the updated CORS permissions.

---

## 5. Required Environment Variables Reference

### Backend (Render / Railway):
| Variable Name | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | Auto | `5000` | Port listened by Gunicorn |
| `FRONTEND_URL` | Recommended | `""` | Allowed CORS origin for your Vercel frontend |
| `ALLOW_ALL_ORIGINS` | Optional | `false` | Set to `true` to allow any domain |
| `PUBLIC_BACKEND_URL` | Optional | Auto | Explicit public URL (e.g., `https://vidvault-api.onrender.com`) |
| `GEMINI_API_KEY` | Optional | `""` | Powers the AI Content Insights drawer |
| `YT_COOKIES` | Optional | `""` | Paste raw text of `cookies.txt` to bypass bot blocks |

### Frontend (Vercel):
| Variable Name | Required | Default | Purpose |
|---|---|---|---|
| `VITE_API_URL` | **Yes** | `""` | Full URL of the backend (e.g., `https://vidvault-api.onrender.com`) |

---

## 6. Build & Startup Commands Reference

### Backend:
- **Build Command (Docker):** Automatic via `Dockerfile`
- **Build Command (Native):** `chmod +x backend/render-build.sh && ./backend/render-build.sh`
- **Startup Command:** `gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 300 backend.app:app`
- **Health-Check Endpoints:**
  - `GET /health` $\rightarrow$ Returns `{"status": "healthy", "ffmpegAvailable": true, "cookiesLoaded": true}`
  - `GET /api` $\rightarrow$ Returns `{"status": "healthy", ...}`

### Frontend:
- **Build Command:** `npm run build`
- **Development Command:** `npm run dev`
- **Output Directory:** `dist`

---

## 7. Production Testing Checklist

After deploying both services, run through this verification checklist:

- [ ] **Backend Health Check:** Open `https://your-backend.onrender.com/health` in a browser. Confirm HTTP 200 and `"ffmpegAvailable": true`.
- [ ] **Frontend Loading:** Open `https://your-frontend.vercel.app`. Ensure the cyberpunk UI, search bar, and badges load cleanly.
- [ ] **Video Format Extraction:** Paste a YouTube link (e.g. `https://www.youtube.com/watch?v=dQw4w9WgXcQ`) and click Analyze. Verify that formats up to 1080p/4K appear with accurate sizes.
- [ ] **Download Execution:** Click a video quality badge (e.g. 720p or 1080p). Confirm that the progress bar displays live speed (MB/s) and remaining ETA.
- [ ] **Browser Download Trigger:** Verify that when progress reaches 100%, the browser initiates a file download of the `.mp4` file.
- [ ] **Local Playback:** Open the downloaded video on your computer in Windows Media Player. Confirm smooth video and audio with no `0x80070002` error.
- [ ] **Audio-Only Download:** Download an MP3 or M4A track. Confirm the downloaded audio plays clearly.

---

## 8. Troubleshooting Common Deployment Failures

### Issue 1: Frontend says "Failed to fetch video information" or "Network Error"
- **Cause:** `VITE_API_URL` was missing during the Vercel build, or CORS blocked the request.
- **Fix:**
  1. Check Vercel Project Settings $\rightarrow$ Environment Variables $\rightarrow$ Ensure `VITE_API_URL` is set to your Render URL (no trailing slash).
  2. In Vercel, click **Redeploy** (environment variables only take effect on new builds).
  3. In Render, set `FRONTEND_URL=https://your-app.vercel.app` or set `ALLOW_ALL_ORIGINS=true`.

### Issue 2: Render Free Tier "Cold Start" Delay
- **Cause:** Render free tier spins down after 15 minutes of inactivity. The first request takes 45–60 seconds to boot.
- **Fix:** Wait 60 seconds on the first request. To keep the service awake, set up a free 10-minute ping using [UptimeRobot](https://uptimerobot.com/) targeting `https://your-backend.onrender.com/health`.

### Issue 3: "Worker Timeout" during large video downloads
- **Cause:** The download or merge took longer than Gunicorn's default 30-second timeout.
- **Fix:** Ensure the Gunicorn start command specifies `--timeout 300` (already pre-configured in `Dockerfile` and commands above).

### Issue 4: "YouTube Authentication / Bot Error"
- **Cause:** YouTube flagged the cloud datacenter's IP address.
- **Fix:** Copy the contents of your exported `cookies.txt` file and paste it into the `YT_COOKIES` environment variable in your Render service settings.

