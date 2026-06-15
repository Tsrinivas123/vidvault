const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

const execPromise = util.promisify(exec);
const app = express();
const PORT = process.env.PORT || 5000;


/* ===============================
   CREATE COOKIES FILE FROM ENV
================================ */

const COOKIES_PATH = path.join(__dirname, 'cookies.txt');

if (process.env.YT_COOKIES) {
  fs.writeFileSync(COOKIES_PATH, process.env.YT_COOKIES);
  console.log('✅ Cookies loaded from ENV');
} else {
  console.log('⚠️ No YT_COOKIES in ENV');
}


/* ===============================
   MIDDLEWARE
================================ */

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://vidvault-frontend.onrender.com'
  ],
  credentials: true
}));

app.use(express.json());
app.use('/downloads', express.static('downloads'));


/* ===============================
   CREATE DOWNLOADS FOLDER
================================ */

if (!fs.existsSync('./downloads')) {
  fs.mkdirSync('./downloads');
}


/* ===============================
   HEALTH CHECK
================================ */

app.get('/', (req, res) => {
  res.json({
    status: 'Backend Running ✅',
    cookiesLoaded: !!process.env.YT_COOKIES
  });
});


/* ===============================
   VIDEO INFO
================================ */

app.post('/api/video-info', async (req, res) => {
  try {

    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }

    // ✅ SINGLE LINE COMMAND
    const cmd = `python3 -m yt_dlp --cookies "${COOKIES_PATH}" --js-runtime node --dump-json --no-playlist "${url}"`;

    const { stdout } = await execPromise(cmd);

    const data = JSON.parse(stdout);

    const formats = data.formats
      .filter(f => f.vcodec !== 'none' && f.acodec !== 'none' && f.height)
      .map(f => ({
        quality: `${f.height}p`,
        ext: f.ext,
        fps: f.fps || 30
      }))
      .sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

    res.json({
      title: data.title,
      thumbnail: data.thumbnail,
      duration: data.duration,
      formats
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Video info failed',
      details: err.message
    });
  }
});


/* ===============================
   GET LINK
================================ */

app.post('/api/get-link', async (req, res) => {
  try {

    const { url, quality } = req.body;

    let format = 'bestvideo+bestaudio/best';

    if (quality) {
      const q = quality.replace('p', '');
      format = `bestvideo[height<=${q}]+bestaudio/best`;
    }

    // ✅ SINGLE LINE COMMAND
    const cmd = `python3 -m yt_dlp --cookies "${COOKIES_PATH}" --js-runtime node -f "${format}" --get-url "${url}"`;

    const { stdout } = await execPromise(cmd);

    res.json({
      success: true,
      directUrl: stdout.trim().split('\n')[0]
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Get link failed',
      details: err.message
    });
  }
});


/* ===============================
   DOWNLOAD
================================ */

app.post('/api/download', async (req, res) => {
  try {

    const { url, quality } = req.body;

    const time = Date.now();

    const output = `./downloads/video_${time}.%(ext)s`;

    let format = 'bestvideo+bestaudio/best';

    if (quality) {
      const q = quality.replace('p', '');
      format = `bestvideo[height<=${q}]+bestaudio/best`;
    }

    // ✅ SINGLE LINE COMMAND
    const cmd = `python3 -m yt_dlp --cookies "${COOKIES_PATH}" --js-runtime node -f "${format}" --merge-output-format mp4 -o "${output}" "${url}"`;

    await execPromise(cmd);

    const file = fs.readdirSync('./downloads')
      .find(f => f.includes(`video_${time}`));

    if (!file) throw new Error('File not found');

    res.json({
      success: true,
      downloadUrl: `${req.protocol}://${req.get('host')}/downloads/${file}`
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Download failed',
      details: err.message
    });
  }
});


/* ===============================
   CLEANUP
================================ */

setInterval(() => {

  if (!fs.existsSync('./downloads')) return;

  fs.readdirSync('./downloads').forEach(f => {

    const p = path.join('./downloads', f);

    if (Date.now() - fs.statSync(p).mtimeMs > 3600000) {
      fs.unlinkSync(p);
    }

  });

}, 3600000);


/* ===============================
   START SERVER
================================ */

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});
