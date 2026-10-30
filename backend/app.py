import os
import sys
import re
import time
import threading
import json
import traceback
import unicodedata
import urllib.parse
import subprocess
import shutil
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_cors import CORS
import yt_dlp
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
except Exception:
    pass

# Resolve absolute paths
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, '..'))
DOWNLOADS_DIR = os.path.join(BACKEND_DIR, 'downloads')
TEMP_DIR = os.path.join(BACKEND_DIR, 'temp')
# Cookie paths and priority resolution:
# 1. Custom path from YT_COOKIES_PATH or COOKIES_PATH environment variables
# 2. Render Secret File mounted at /etc/secrets/cookies.txt
# 3. Local development file at backend/cookies.txt
RENDER_SECRET_COOKIES = '/etc/secrets/cookies.txt'
LOCAL_COOKIES_PATH = os.path.join(BACKEND_DIR, 'cookies.txt')

def is_valid_cookie_file(path) -> bool:
    """Check if a path exists, is a regular file, is readable, and is non-empty without reading full contents."""
    try:
        if not path or not os.path.isfile(path):
            return False
        if os.path.getsize(path) <= 0:
            return False
        # Test basic read permission without reading full file or logging
        with open(path, 'rb') as f:
            f.read(1)
        return True
    except (OSError, IOError, PermissionError):
        return False

def get_active_cookie_file():
    """
    Resolve active cookie file strictly in priority order:
    1. Valid custom path from YT_COOKIES_PATH or COOKIES_PATH.
    2. Valid Render Secret File at /etc/secrets/cookies.txt.
    3. Valid local file at backend/cookies.txt.
    Returns the absolute path if valid, readable, and non-empty; otherwise None.
    """
    custom_path = os.environ.get('YT_COOKIES_PATH') or os.environ.get('COOKIES_PATH')
    candidates = [custom_path, RENDER_SECRET_COOKIES, LOCAL_COOKIES_PATH]
    for candidate in candidates:
        if candidate and is_valid_cookie_file(candidate):
            return os.path.abspath(candidate)
    return None

# Ensure directories exist
os.makedirs(DOWNLOADS_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# Purge any orphaned temporary files from previous server crashes/restarts
try:
    if os.path.exists(TEMP_DIR):
        for f in os.listdir(TEMP_DIR):
            p = os.path.join(TEMP_DIR, f)
            if os.path.isfile(p):
                try:
                    os.remove(p)
                except OSError:
                    pass
except Exception:
    pass

# Initialize cookies from YT_COOKIES environment variable if provided
yt_cookies_env = (os.environ.get('YT_COOKIES') or '').strip()
if yt_cookies_env:
    # Never overwrite Render Secret File or any existing valid cookie file
    if not get_active_cookie_file():
        try:
            # Avoid unnecessary disk writes if local file already has identical content
            should_write = True
            if os.path.exists(LOCAL_COOKIES_PATH):
                try:
                    with open(LOCAL_COOKIES_PATH, 'r', encoding='utf-8') as f:
                        if f.read().strip() == yt_cookies_env:
                            should_write = False
                except Exception:
                    pass

            if should_write:
                with open(LOCAL_COOKIES_PATH, 'w', encoding='utf-8') as f:
                    f.write(yt_cookies_env)
                print("[VidVault] Initialized local cookies from YT_COOKIES environment variable.", flush=True)
        except Exception as e:
            print(f"[VidVault] Warning: Failed to write cookies to local file: {e}", flush=True)

# Expose COOKIES_PATH for backwards-compatibility
COOKIES_PATH = get_active_cookie_file() or LOCAL_COOKIES_PATH

# -----------------------------------------------------------------------
# Thread-safe download tracking & concurrency control
# -----------------------------------------------------------------------
_download_progress = {}
_progress_lock = threading.Lock()
# Allow up to 3 concurrent downloads to avoid resource exhaustion / rate-limiting
DOWNLOAD_SEMAPHORE = threading.Semaphore(3)

# In-memory video info cache (URL -> {info, timestamp}) to eliminate redundant extractions
_info_cache = {}
_info_cache_lock = threading.Lock()

def cache_video_info(url: str, info: dict):
    with _info_cache_lock:
        if len(_info_cache) > 50:
            oldest = min(_info_cache.keys(), key=lambda k: _info_cache[k]['timestamp'])
            _info_cache.pop(oldest, None)
        _info_cache[url] = {
            'info': info,
            'timestamp': time.time()
        }

def get_cached_video_info(url: str, max_age_seconds: int = 600):
    with _info_cache_lock:
        entry = _info_cache.get(url)
        if entry and (time.time() - entry['timestamp'] < max_age_seconds):
            return entry['info']
        return None

def _set_progress(download_id: str, **kwargs):
    with _progress_lock:
        if download_id not in _download_progress:
            _download_progress[download_id] = {}
        _download_progress[download_id].update(kwargs)

def _get_progress(download_id: str):
    with _progress_lock:
        val = _download_progress.get(download_id)
        return val.copy() if val else None

# -----------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------
def get_ydl_opts_cookies():
    opts = {
        'socket_timeout': 30,
        'retries': 5,
        'fragment_retries': 5,
        'http_chunk_size': 10485760,  # 10 MB chunks to prevent Google Video rate limiting
        'concurrent_fragment_downloads': 8,  # 8 concurrent DASH/HLS fragment workers
        'buffersize': 1024 * 1024,    # 1 MB buffer for fast I/O throughput
        'skip_unavailable_fragments': True,
        'js_runtimes': {'node': {}},  # Use Node.js runtime for YouTube cipher decryption
        'noplaylist': True,
    }
    if FFMPEG_DIR:
        opts['ffmpeg_location'] = FFMPEG_DIR
    active_cookie_file = get_active_cookie_file()
    if active_cookie_file:
        opts['cookiefile'] = active_cookie_file
    else:
        cookies_browser = os.environ.get('YT_COOKIES_FROM_BROWSER')
        if cookies_browser:
            opts['cookiesfrombrowser'] = (cookies_browser,)
    return opts

def sanitize_filename(title: str, max_len: int = 60) -> str:
    """Normalize unicode to safe ASCII alphanumeric characters for Windows/Linux."""
    norm = unicodedata.normalize('NFKD', title).encode('ascii', 'ignore').decode('ascii')
    clean = re.sub(r'[^a-zA-Z0-9._-]+', '_', norm).strip('._- ')
    return clean[:max_len] or 'video'

FFMPEG_BIN = shutil.which('ffmpeg')
if not FFMPEG_BIN:
    for candidate in [
        r'C:\Users\tusha\AppData\Local\Programs\Python\Python313\Scripts\ffmpeg.exe',
        os.path.expanduser('~/bin/ffmpeg'),
        '/usr/local/bin/ffmpeg',
        '/usr/bin/ffmpeg'
    ]:
        if os.path.exists(candidate):
            FFMPEG_BIN = candidate
            break
if not FFMPEG_BIN:
    FFMPEG_BIN = 'ffmpeg'

FFMPEG_DIR = os.path.dirname(FFMPEG_BIN) if (os.path.isabs(FFMPEG_BIN) and os.path.exists(FFMPEG_BIN)) else None

def inspect_media_file(filepath: str):
    """Inspects a media file using ffmpeg to verify duration, video & audio streams."""
    try:
        ffmpeg_cmd = FFMPEG_BIN if os.path.exists(FFMPEG_BIN) else 'ffmpeg'
        res = subprocess.run(
            [ffmpeg_cmd, '-i', filepath],
            stderr=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=10
        )
        out = res.stderr
        info = {'duration': None, 'video_stream': None, 'audio_stream': None}
        for line in out.splitlines():
            line = line.strip()
            if 'Duration:' in line and not info['duration']:
                info['duration'] = line.split('Duration:')[1].split(',')[0].strip()
            if 'Stream #' in line and 'Video:' in line and not info['video_stream']:
                info['video_stream'] = line.split('Video:')[1].strip()
            if 'Stream #' in line and 'Audio:' in line and not info['audio_stream']:
                info['audio_stream'] = line.split('Audio:')[1].strip()
        return info
    except Exception as e:
        print(f"Media inspection error: {e}", flush=True)
        return None

def make_progress_hook(download_id: str):
    _set_progress(download_id, status='starting', percent=0, speed='', eta='', filename='', stage='Connecting to stream...')
    last_log = [0.0]
    seen_streams = set()

    def hook(d):
        status = d.get('status')
        if status == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes') or 0
            speed = d.get('speed') or 0
            eta = d.get('eta') or 0

            info_dict = d.get('info_dict') or {}
            fmt_id = str(info_dict.get('format_id') or '')
            vcodec = info_dict.get('vcodec') or ''
            acodec = info_dict.get('acodec') or ''

            if fmt_id and fmt_id not in seen_streams:
                seen_streams.add(fmt_id)

            is_audio_stream = (vcodec == 'none' and acodec != 'none')
            is_video_stream = (vcodec != 'none' and acodec == 'none')

            raw_pct = (downloaded / total * 100) if total > 0 else 0

            if is_audio_stream and len(seen_streams) > 1:
                # 2nd stream (audio DASH)
                pct = round(85.0 + (raw_pct * 0.12), 1)
                stage_label = 'Downloading audio stream'
            elif is_video_stream:
                # 1st stream (video DASH)
                pct = round(raw_pct * 0.85, 1)
                stage_label = 'Downloading video stream'
            else:
                pct = round(raw_pct * 0.95, 1)
                stage_label = 'Downloading'

            spd_str = f"{speed / (1024*1024):.2f} MB/s" if speed else ''
            eta_str = f"{eta}s" if eta else ''

            _set_progress(
                download_id,
                status='downloading',
                stage=stage_label,
                percent=min(pct, 98.0),
                downloaded_bytes=downloaded,
                total_bytes=total,
                speed=spd_str,
                eta=eta_str
            )

            now = time.time()
            if now - last_log[0] >= 0.8:
                last_log[0] = now
                dl_mb = f"{downloaded / (1024*1024):.1f} MB"
                tot_mb = f"{total / (1024*1024):.1f} MB" if total > 0 else "..."
                print(f"  -> [{stage_label} {download_id[:8]}] {pct}% ({dl_mb}/{tot_mb}) @ {spd_str} | ETA: {eta_str}", flush=True)

        elif status == 'finished':
            _set_progress(download_id, status='processing', stage='Merging streams with FFmpeg', percent=98, speed='', eta='Processing...')
            print(f"  -> [Progress {download_id[:8]}] Stream download complete! Fast FFmpeg stream-muxing...", flush=True)

        elif status == 'error':
            _set_progress(download_id, status='error', stage='Error', percent=0, error=str(d.get('error', 'Download stream error')))
    return hook

class TerminalLogger:
    def debug(self, msg):
        pass
    def warning(self, msg):
        print(f"  [Warning] {msg}", flush=True)
    def error(self, msg):
        print(f"  [Error] {msg}", flush=True)

def run_ytdl(ydl_opts, action_fn, *args, **kwargs):
    opts = ydl_opts.copy()
    opts['logger'] = TerminalLogger()

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            return action_fn(ydl, *args, **kwargs)
    except Exception as e:
        err_msg = str(e)
        has_cookies = 'cookiesfrombrowser' in opts or 'cookiefile' in opts
        should_fallback = any(msg in err_msg for msg in [
            "Could not copy", "Permission denied", "database is locked",
            "sharing violation", "Failed to decrypt", "Requested format is not available",
            "format is not available", "no longer valid", "expired", "Sign in",
            "invalid Netscape", "failed to load cookies", "CookieLoadError"
        ])

        if has_cookies and should_fallback:
            print(f"Warning: Cookie access failed or format not available. Retrying without cookies... Error: {e}")
            fallback_opts = opts.copy()
            fallback_opts.pop('cookiesfrombrowser', None)
            fallback_opts.pop('cookiefile', None)
            with yt_dlp.YoutubeDL(fallback_opts) as ydl:
                return action_fn(ydl, *args, **kwargs)
        raise e

def handle_ytdl_error(e):
    err_msg = str(e)
    is_cookie_auth_issue = any(msg in err_msg for msg in [
        "confirm you",
        "not a bot",
        "Requested format is not available",
        "format is not available",
        "Sign in to confirm",
        "Sign in to check"
    ])
    if is_cookie_auth_issue:
        return jsonify({
            'error': (
                'YouTube Authentication / Cookie Error!\n\n'
                'YouTube is blocking the request or requesting authentication. This usually happens if your cookies have expired or Chrome locks its cookie database.\n\n'
                'Workaround: Export a fresh "cookies.txt" file using a browser extension (like "Get cookies.txt LOCALLY") and place it in the backend folder.'
            ),
            'details': err_msg
        }), 500
    return None

# -----------------------------------------------------------------------
# Flask app initialization
# -----------------------------------------------------------------------
DIST_DIR = os.path.join(ROOT_DIR, 'dist')
STATIC_FOLDER = DIST_DIR if os.path.exists(DIST_DIR) else ROOT_DIR
app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path='')

# Apply ProxyFix for proper header handling behind Render / Vercel / Railway reverse proxies
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    # Specific production domain and preview deployments for VidVault (prevents arbitrary origin access)
    re.compile(r"^https://vidvault.*\.vercel\.app$"),
    re.compile(r"^https://.*vidvault.*\.onrender\.com$"),
]

FRONTEND_URL = os.environ.get('FRONTEND_URL', '').strip()
if FRONTEND_URL:
    for u in FRONTEND_URL.split(','):
        u_clean = u.strip().rstrip('/')
        if u_clean and u_clean not in allowed_origins:
            allowed_origins.append(u_clean)

allow_all = os.environ.get('ALLOW_ALL_ORIGINS', '').lower() in ('true', '1')

CORS(app, resources={
    r"/api/*": {"origins": "*" if allow_all else allowed_origins},
    r"/downloads/*": {"origins": "*" if allow_all else allowed_origins}
}, supports_credentials=True)

# -----------------------------------------------------------------------
# Static File & Downloads Serving
# -----------------------------------------------------------------------
@app.route('/')
def index():
    return send_from_directory(STATIC_FOLDER, 'index.html')

@app.route('/downloads/<path:filename>')
def serve_download(filename):
    # Unquote URL-encoded filenames and protect against directory traversal
    unquoted = urllib.parse.unquote(filename)
    safe_name = os.path.basename(os.path.normpath(unquoted))
    target_path = os.path.join(DOWNLOADS_DIR, safe_name)

    if not safe_name or not os.path.exists(target_path):
        return jsonify({'error': 'File not found on server', 'filename': safe_name}), 404

    return send_from_directory(DOWNLOADS_DIR, safe_name, as_attachment=True)

# -----------------------------------------------------------------------
# Health Check Endpoint
# -----------------------------------------------------------------------
@app.route('/api', methods=['GET'])
@app.route('/api/', methods=['GET'])
@app.route('/health', methods=['GET'])
def health_check():
    has_ffmpeg = (shutil.which('ffmpeg') is not None) or (bool(FFMPEG_DIR) and os.path.exists(FFMPEG_BIN))
    return jsonify({
        'status': 'healthy',
        'service': 'VidVault Backend API',
        'cookiesLoaded': bool(get_active_cookie_file() is not None),
        'ffmpegAvailable': bool(has_ffmpeg)
    })

# -----------------------------------------------------------------------
# Video Info Endpoint
# -----------------------------------------------------------------------
@app.route('/api/video-info', methods=['POST'])
def video_info():
    try:
        data = request.json or {}
        url = data.get('url')
        if not url:
            return jsonify({'error': 'URL required'}), 400

        print(f"\n[VidVault] [INFO] Video Info Request: {url}", flush=True)

        ydl_opts = {
            'noplaylist': True,
            'extract_flat': False,
            **get_ydl_opts_cookies()
        }

        info = run_ytdl(ydl_opts, lambda ydl: ydl.extract_info(url, download=False))
        raw_formats = info.get('formats', [])

        # Collect available heights from ALL streams (video-only + pre-merged)
        available_heights = set()
        for f in raw_formats:
            vcodec = f.get('vcodec')
            height = f.get('height')
            if vcodec and vcodec != 'none' and height and height > 0:
                available_heights.add(int(height))

        sorted_heights = sorted(available_heights, reverse=True)

        # Pre-merged formats for filesize hints
        formats = []
        seen_qualities = set()
        for f in raw_formats:
            vcodec = f.get('vcodec')
            acodec = f.get('acodec')
            height = f.get('height')
            if vcodec and vcodec != 'none' and acodec and acodec != 'none' and height:
                quality = f"{height}p"
                ext = f.get('ext', 'mp4')
                fps = f.get('fps') or 30
                filesize = f.get('filesize') or f.get('filesize_approx') or 0
                key = (quality, ext)
                if key not in seen_qualities:
                    seen_qualities.add(key)
                    formats.append({
                        'quality': quality,
                        'ext': ext,
                        'fps': fps,
                        'filesize': filesize
                    })

        formats.sort(key=lambda x: int(x['quality'].replace('p', '')) if x['quality'].replace('p', '').isdigit() else 0, reverse=True)
        title = info.get('title')
        cache_video_info(url, info)
        print(f"[VidVault] [OK] Video Found & Cached: '{title}' | Supported Heights: {sorted_heights}", flush=True)

        return jsonify({
            'title': title,
            'thumbnail': info.get('thumbnail'),
            'duration': info.get('duration', 0),
            'uploader': info.get('uploader') or info.get('channel') or 'YouTube Creator',
            'formats': formats,
            'available_heights': sorted_heights
        })

    except Exception as e:
        print(f"Error in video-info: {e}", flush=True)
        error_resp = handle_ytdl_error(e)
        if error_resp:
            return error_resp
        return jsonify({
            'error': 'Video info failed',
            'details': str(e)
        }), 500

# -----------------------------------------------------------------------
# Download Progress Status Endpoint
# -----------------------------------------------------------------------
@app.route('/api/download/status/<download_id>', methods=['GET'])
def download_status(download_id):
    prog = _get_progress(download_id)
    if not prog:
        return jsonify({'status': 'unknown', 'percent': 0}), 404
    return jsonify(prog)

# -----------------------------------------------------------------------
# Download Endpoint
# -----------------------------------------------------------------------
@app.route('/api/download', methods=['POST'])
def download():
    # Enforce concurrency limit to prevent resource exhaustion / connection stalls
    if not DOWNLOAD_SEMAPHORE.acquire(blocking=True, timeout=120):
        return jsonify({'error': 'Server is busy processing other downloads. Please try again shortly.'}), 503

    try:
        data = request.json or {}
        url = data.get('url')
        quality = data.get('quality')
        media_type = data.get('type')    # 'video' or 'audio'
        fmt = data.get('format')         # 'mp4', 'webm', 'mp3', 'm4a'
        download_id = data.get('download_id', f"dl_{int(time.time()*1000)}")

        if not url:
            return jsonify({'error': 'URL required'}), 400

        import shutil
        has_ffmpeg = shutil.which('ffmpeg') is not None
        ffmpeg_exe = r'C:\Users\tusha\AppData\Local\Programs\Python\Python313\Scripts\ffmpeg.exe'
        if not has_ffmpeg and os.path.exists(ffmpeg_exe):
            has_ffmpeg = True

        timestamp = int(time.time() * 1000)
        temp_prefix = f"tmp_{download_id}_{timestamp}"

        print(f"\n{'='*55}", flush=True)
        print(f"[VidVault] [DOWNLOAD START] id={download_id}", flush=True)
        print(f"  * URL:        {url}", flush=True)
        print(f"  * Quality:    {quality}", flush=True)
        print(f"  * Media Type: {str(media_type).upper()} ({fmt})", flush=True)
        print(f"  * FFmpeg:     {'Available' if has_ffmpeg else 'Not found'}", flush=True)
        print(f"{'='*55}", flush=True)

        progress_hook = make_progress_hook(download_id)

        # Download into temporary directory first to isolate from completed files
        temp_output_tmpl = os.path.join(TEMP_DIR, f"{temp_prefix}.%(ext)s")

        if media_type == 'audio':
            codec = fmt if fmt in ['mp3', 'm4a'] else 'mp3'
            kbps = quality.replace('kbps', '') if quality else '320'
            if kbps not in ['128', '192', '320']:
                kbps = '320'

            if codec == 'm4a':
                # Direct download without re-encoding (YouTube native AAC stream in m4a container)
                ydl_opts = {
                    'format': 'bestaudio[ext=m4a]/bestaudio',
                    'outtmpl': temp_output_tmpl,
                    'progress_hooks': [progress_hook],
                    **get_ydl_opts_cookies()
                }
            elif has_ffmpeg:
                # Fast multithreaded MP3 encoding from best AAC source
                ydl_opts = {
                    'format': 'bestaudio[ext=m4a]/bestaudio/best',
                    'outtmpl': temp_output_tmpl,
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': kbps,
                    }],
                    'postprocessor_args': {
                        'FFmpegExtractAudio': ['-threads', '0']
                    },
                    'progress_hooks': [progress_hook],
                    **get_ydl_opts_cookies()
                }
            else:
                ydl_opts = {
                    'format': 'bestaudio/best',
                    'outtmpl': temp_output_tmpl,
                    'progress_hooks': [progress_hook],
                    **get_ydl_opts_cookies()
                }
        else:
            ext = fmt if fmt in ['mp4', 'webm'] else 'mp4'

            if has_ffmpeg:
                q = quality.replace('p', '') if quality else None
                if q:
                    # Comprehensive fallback chain preferring H.264 (avc1) + AAC (m4a) for universal playback
                    ytdl_format = (
                        f"bestvideo[height={q}][vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/"
                        f"bestvideo[height={q}][ext=mp4]+bestaudio[ext=m4a]/"
                        f"bestvideo[height={q}]+bestaudio[ext=m4a]/"
                        f"bestvideo[height={q}]+bestaudio/"
                        f"bestvideo[height<={q}][vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/"
                        f"bestvideo[height<={q}][ext=mp4]+bestaudio[ext=m4a]/"
                        f"bestvideo[height<={q}]+bestaudio/"
                        f"best[height<={q}]/"
                        f"best"
                    )
                else:
                    ytdl_format = (
                        "bestvideo[vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/"
                        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/"
                        "bestvideo+bestaudio[ext=m4a]/"
                        "bestvideo+bestaudio/best"
                    )

                ydl_opts = {
                    'format': ytdl_format,
                    'outtmpl': temp_output_tmpl,
                    'merge_output_format': ext,
                    'postprocessor_args': {
                        'merger': ['-c', 'copy']  # Efficient direct stream copy (no re-encoding)
                    },
                    'progress_hooks': [progress_hook],
                    **get_ydl_opts_cookies()
                }
            else:
                # Fallback when FFmpeg is not installed
                ydl_opts = {
                    'format': 'best',
                    'outtmpl': temp_output_tmpl,
                    'progress_hooks': [progress_hook],
                    **get_ydl_opts_cookies()
                }

        # Perform the actual download with fresh session signatures to prevent HTTP 403 Forbidden
        info_dict = run_ytdl(ydl_opts, lambda ydl: ydl.extract_info(url, download=True))
        video_title = info_dict.get('title', 'video') if info_dict else 'video'

        # Locate completed temporary output file (excluding active .part / .ytdl files)
        temp_downloaded_file = None
        best_size = 0
        for f in os.listdir(TEMP_DIR):
            if f.startswith(temp_prefix) and not f.endswith(('.part', '.ytdl', '.temp')):
                fp = os.path.join(TEMP_DIR, f)
                try:
                    sz = os.path.getsize(fp)
                    if sz > best_size:
                        best_size = sz
                        temp_downloaded_file = fp
                except OSError:
                    continue

        if not temp_downloaded_file or not os.path.exists(temp_downloaded_file):
            raise Exception("Downloaded file not found in temporary staging directory.")

        # Validate that the file is not empty
        file_size = os.path.getsize(temp_downloaded_file)
        if file_size == 0:
            os.remove(temp_downloaded_file)
            raise Exception("Downloaded file is empty (0 bytes). Download failed.")

        # Inspect resulting container with ffmpeg
        media_info = inspect_media_file(temp_downloaded_file)
        print(f"  * Media Verified: {media_info}", flush=True)

        # Build clean final filename with safe alphanumeric title, quality label, and extension
        _, final_ext = os.path.splitext(temp_downloaded_file)
        final_ext = final_ext.lstrip('.') or ('mp3' if media_type == 'audio' else 'mp4')
        clean_title = sanitize_filename(video_title, max_len=50)
        quality_tag = quality if quality else ('audio' if media_type == 'audio' else 'video')
        final_filename = f"{clean_title}_{quality_tag}_{timestamp}.{final_ext}"
        final_filepath = os.path.join(DOWNLOADS_DIR, final_filename)

        # Move atomically from temporary staging to final downloads directory
        shutil.move(temp_downloaded_file, final_filepath)

        # Verify final file exists in downloads
        if not os.path.exists(final_filepath) or os.path.getsize(final_filepath) == 0:
            raise Exception("Failed to finalize output file in downloads directory.")

        final_file_size = os.path.getsize(final_filepath)
        public_url = os.environ.get('PUBLIC_BACKEND_URL', '').rstrip('/')
        if public_url:
            download_url = f"{public_url}/downloads/{urllib.parse.quote(final_filename)}"
        else:
            scheme = request.headers.get('X-Forwarded-Proto', request.scheme)
            host = request.headers.get('X-Forwarded-Host', request.host)
            download_url = f"{scheme}://{host}/downloads/{urllib.parse.quote(final_filename)}"

        # Mark progress status as complete
        _set_progress(
            download_id,
            status='complete',
            percent=100,
            speed='',
            eta='',
            filename=final_filename,
            filesize=final_file_size,
            downloadUrl=download_url,
            media_info=media_info
        )

        print(f"[VidVault] [DOWNLOAD SUCCESS]", flush=True)
        print(f"  * File: {final_filename} ({final_file_size:,} bytes)", flush=True)
        print(f"  * URL:  {download_url}", flush=True)
        print(f"{'='*55}\n", flush=True)

        return jsonify({
            'success': True,
            'downloadUrl': download_url,
            'filename': final_filename,
            'filesize': final_file_size,
            'media_info': media_info
        })

    except Exception as e:
        print(f"\n[VidVault] [DOWNLOAD FAILED]", flush=True)
        print(f"  * Error: {e}", flush=True)
        print(f"{'='*55}\n", flush=True)
        traceback.print_exc()

        # Update progress status
        dl_id = (data.get('download_id') if 'data' in dir() and isinstance(data, dict) else None) or 'unknown'
        _set_progress(dl_id, status='error', percent=0, error=str(e))

        error_resp = handle_ytdl_error(e)
        if error_resp:
            return error_resp
        err_str = str(e)
        return jsonify({
            'error': f"Download failed: {err_str}",
            'details': err_str
        }), 500

    finally:
        DOWNLOAD_SEMAPHORE.release()

# -----------------------------------------------------------------------
# Gemini SEO Insights Endpoint
# -----------------------------------------------------------------------
@app.route('/api/seo-insights', methods=['POST'])
def seo_insights():
    try:
        data = request.json or {}
        title = data.get('title')
        if not title:
            return jsonify({'error': 'Title required'}), 400

        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            time.sleep(0.5)
            return jsonify({
                'optimizedTitle': f"Ultimate Guide: {title} (2026 Tutorial)",
                'tags': ["#viral", "#guide", "#tutorial", "#tech", "#2026"],
                'description': f"In this video, we dive deep into {title}. Learn the best strategies and tips to master this topic quickly. Don't forget to like and subscribe for more content!",
                'seoScore': 88,
                'viralPotential': "High",
                'trendingScore': 82,
                'category': "Technology",
                'suggestedKeywords': ["youtube downloader", "video tools", "saas", "tech guide", "4k downloader"],
                'bestHashtags': ["#tech", "#tutorial", "#downloader", "#vidvault"],
                'contentSummary': "An in-depth look and step-by-step tutorial on optimizing your workflow.",
                'titleAnalysis': "Excellent title structure with strong keywords.",
                'uploadDate': "October 2026"
            })

        import google.genai as genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        prompt = f'Generate SEO analysis and metadata for a YouTube video with the title: "{title}". Return an optimized title, description, keywords, hashtags, an SEO score (0-100), a trending score (0-100), category, viral potential (Low/Medium/High), a brief summary, and a short title analysis.'

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        'optimizedTitle': types.Schema(type=types.Type.STRING),
                        'tags': types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING)),
                        'description': types.Schema(type=types.Type.STRING),
                        'seoScore': types.Schema(type=types.Type.INTEGER),
                        'viralPotential': types.Schema(type=types.Type.STRING),
                        'trendingScore': types.Schema(type=types.Type.INTEGER),
                        'category': types.Schema(type=types.Type.STRING),
                        'suggestedKeywords': types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING)),
                        'bestHashtags': types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING)),
                        'contentSummary': types.Schema(type=types.Type.STRING),
                        'titleAnalysis': types.Schema(type=types.Type.STRING),
                        'uploadDate': types.Schema(type=types.Type.STRING)
                    },
                    required=[
                        'optimizedTitle', 'tags', 'description', 'seoScore',
                        'viralPotential', 'trendingScore', 'category',
                        'suggestedKeywords', 'bestHashtags', 'contentSummary',
                        'titleAnalysis', 'uploadDate'
                    ]
                )
            )
        )
        return jsonify(json.loads(response.text))

    except Exception as e:
        print(f"Error in seo-insights: {e}")
        return jsonify({
            'error': 'SEO generation failed',
            'details': str(e)
        }), 500

# -----------------------------------------------------------------------
# Background Cleanup
# -----------------------------------------------------------------------
def cleanup_loop():
    while True:
        try:
            now = time.time()
            # Clean temporary files older than 30 minutes
            if os.path.exists(TEMP_DIR):
                for f in os.listdir(TEMP_DIR):
                    p = os.path.join(TEMP_DIR, f)
                    if os.path.isfile(p) and (now - os.path.getmtime(p) > 1800):
                        try:
                            os.remove(p)
                        except OSError:
                            pass

            # Clean completed downloads older than 2 hours
            if os.path.exists(DOWNLOADS_DIR):
                for f in os.listdir(DOWNLOADS_DIR):
                    p = os.path.join(DOWNLOADS_DIR, f)
                    if os.path.isfile(p) and (now - os.path.getmtime(p) > 7200):
                        try:
                            os.remove(p)
                            print(f"[Cleanup] Removed expired download: {f}", flush=True)
                        except OSError:
                            pass
        except Exception as e:
            print(f"Error in cleanup: {e}", flush=True)
        time.sleep(600)

cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
cleanup_thread.start()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() in ('true', '1')
    app.run(host='0.0.0.0', port=port, debug=debug)
