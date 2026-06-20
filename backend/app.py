import os
import time
import threading
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import yt_dlp
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Resolve paths
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, '..'))
DOWNLOADS_DIR = os.path.join(BACKEND_DIR, 'downloads')
COOKIES_PATH = os.path.join(BACKEND_DIR, 'cookies.txt')

def get_ydl_opts_cookies():
    opts = {
        'js_runtimes': {'deno': {}, 'node': {}},
        'remote_components': ['ejs:github', 'ejs:npm']
    }
    if os.path.exists(COOKIES_PATH):
        opts['cookiefile'] = COOKIES_PATH
    else:
        cookies_browser = os.environ.get('YT_COOKIES_FROM_BROWSER')
        if cookies_browser:
            opts['cookiesfrombrowser'] = (cookies_browser,)
    return opts

class NullLogger:
    def debug(self, msg):
        pass
    def warning(self, msg):
        pass
    def error(self, msg):
        pass

def run_ytdl(ydl_opts, action_fn, *args, **kwargs):
    opts = ydl_opts.copy()
    opts['logger'] = NullLogger()
    
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            return action_fn(ydl, *args, **kwargs)
    except Exception as e:
        err_msg = str(e)
        has_cookies = 'cookiesfrombrowser' in opts or 'cookiefile' in opts
        should_fallback = any(msg in err_msg for msg in [
            "Could not copy", "Permission denied", "database is locked", 
            "sharing violation", "Failed to decrypt", "Requested format is not available",
            "format is not available"
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
                '👉 Workaround 1 (Easiest): Close Google Chrome completely. Then, open this downloader site in another browser (like Microsoft Edge). This allows the backend to read fresh cookies from Chrome without permission issues.\n\n'
                '👉 Workaround 2: If you are using a "cookies.txt" file in the "backend/" folder, your cookies may have expired. Please export a fresh "cookies.txt" file using a browser extension (like "Get cookies.txt LOCALLY") and replace the old one.'
            ),
            'details': err_msg
        }), 500
    return None

# Create downloads folder
if not os.path.exists(DOWNLOADS_DIR):
    os.makedirs(DOWNLOADS_DIR)

# Initialize cookies file from env if available
if os.environ.get('YT_COOKIES'):
    with open(COOKIES_PATH, 'w', encoding='utf-8') as f:
        f.write(os.environ.get('YT_COOKIES'))
    print('Cookies loaded from ENV')
else:
    print('No YT_COOKIES in ENV')

# Initialize Flask app
DIST_DIR = os.path.join(ROOT_DIR, 'dist')
STATIC_FOLDER = DIST_DIR if os.path.exists(DIST_DIR) else ROOT_DIR
app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path='')

# Configure CORS
CORS(app, resources={r"/api/*": {
    "origins": [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://vidvault-frontend.onrender.com"
    ]
}}, supports_credentials=True)

# ===============================
# STATIC FILE SERVING
# ===============================

@app.route('/')
def index():
    return send_from_directory(STATIC_FOLDER, 'index.html')

@app.route('/downloads/<path:filename>')
def serve_download(filename):
    return send_from_directory(DOWNLOADS_DIR, filename, as_attachment=True)

# ===============================
# HEALTH CHECK
# ===============================

@app.route('/api', methods=['GET'])
@app.route('/api/', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'Backend Running',
        'cookiesLoaded': os.path.exists(COOKIES_PATH)
    })

# ===============================
# VIDEO INFO
# ===============================

@app.route('/api/video-info', methods=['POST'])
def video_info():
    try:
        data = request.json or {}
        url = data.get('url')
        if not url:
            return jsonify({'error': 'URL required'}), 400

        ydl_opts = {
            'noplaylist': True,
            'extract_flat': False,
            **get_ydl_opts_cookies()
        }

        info = run_ytdl(ydl_opts, lambda ydl: ydl.extract_info(url, download=False))

        raw_formats = info.get('formats', [])
        formats = []
        seen_qualities = set()

        for f in raw_formats:
            vcodec = f.get('vcodec')
            acodec = f.get('acodec')
            height = f.get('height')

            # Filter formats with both video & audio and height (pre-merged streams)
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

        # Sort formats by resolution descending
        def get_height_num(fmt):
            q = fmt['quality'].replace('p', '')
            return int(q) if q.isdigit() else 0

        formats.sort(key=get_height_num, reverse=True)

        return jsonify({
            'title': info.get('title'),
            'thumbnail': info.get('thumbnail'),
            'duration': info.get('duration', 0),
            'uploader': info.get('uploader') or info.get('channel') or 'YouTube Creator',
            'formats': formats
        })

    except Exception as e:
        print(f"Error in video-info: {e}")
        error_resp = handle_ytdl_error(e)
        if error_resp:
            return error_resp
        return jsonify({
            'error': 'Video info failed',
            'details': str(e)
        }), 500

# ===============================
# GET DIRECT LINK
# ===============================

@app.route('/api/get-link', methods=['POST'])
def get_link():
    try:
        data = request.json or {}
        url = data.get('url')
        quality = data.get('quality')

        if not url:
            return jsonify({'error': 'URL required'}), 400

        # Select format
        if quality:
            q = quality.replace('p', '')
            fmt = f"bestvideo[height<={q}]+bestaudio/best"
        else:
            fmt = "bestvideo+bestaudio/best"

        ydl_opts = {
            'format': fmt,
            'noplaylist': True,
            **get_ydl_opts_cookies()
        }

        info = run_ytdl(ydl_opts, lambda ydl: ydl.extract_info(url, download=False))
        
        # Extract direct URL from format info
        direct_url = info.get('url')
        if not direct_url:
            # Fallback to scanning formats
            for f in info.get('formats', []):
                if f.get('url'):
                    direct_url = f.get('url')
                    break

        if not direct_url:
            raise Exception("Could not find direct stream URL")

        return jsonify({
            'success': True,
            'directUrl': direct_url
        })

    except Exception as e:
        print(f"Error in get-link: {e}")
        error_resp = handle_ytdl_error(e)
        if error_resp:
            return error_resp
        return jsonify({
            'error': 'Get link failed',
            'details': str(e)
        }), 500

# ===============================
# DOWNLOAD LOCALLY
# ===============================

@app.route('/api/download', methods=['POST'])
def download():
    try:
        data = request.json or {}
        url = data.get('url')
        quality = data.get('quality')
        media_type = data.get('type')   # 'video' or 'audio'
        fmt = data.get('format')        # 'mp4', 'webm', 'mp3', 'm4a'

        if not url:
            return jsonify({'error': 'URL required'}), 400

        timestamp = int(time.time() * 1000)

        # Check if ffmpeg is available
        import shutil
        has_ffmpeg = shutil.which('ffmpeg') is not None
        print(f"has_ffmpeg check: {has_ffmpeg}")

        if media_type == 'audio':
            if has_ffmpeg:
                output_tmpl = os.path.join(DOWNLOADS_DIR, f'audio_{timestamp}.%(ext)s')
                codec = fmt if fmt in ['mp3', 'm4a'] else 'mp3'
                kbps = quality.replace('kbps', '') if quality else '320'
                if kbps not in ['128', '192', '320']:
                    kbps = '320'

                ydl_opts = {
                    'format': 'bestaudio/best',
                    'outtmpl': output_tmpl,
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': codec,
                        'preferredquality': kbps,
                    }],
                    **get_ydl_opts_cookies()
                }
            else:
                print("ffmpeg not found for audio. Downloading raw audio stream directly...")
                output_tmpl = os.path.join(DOWNLOADS_DIR, f'audio_{timestamp}.%(ext)s')
                ydl_opts = {
                    'format': 'bestaudio/best',
                    'outtmpl': output_tmpl,
                    **get_ydl_opts_cookies()
                }
        else:
            output_tmpl = os.path.join(DOWNLOADS_DIR, f'video_{timestamp}.%(ext)s')
            ext = fmt if fmt in ['mp4', 'webm'] else 'mp4'
            
            if has_ffmpeg:
                q = quality.replace('p', '') if quality else None
                ytdl_format = f"bestvideo[height<={q}][ext={ext}]+bestaudio/best" if q else f"bestvideo[ext={ext}]+bestaudio/best"
                ydl_opts = {
                    'format': ytdl_format,
                    'outtmpl': output_tmpl,
                    'merge_output_format': ext,
                    **get_ydl_opts_cookies()
                }
            else:
                print("ffmpeg not found for video. Finding pre-merged format...")
                
                # Fetch video formats list first
                extract_opts = {
                    'noplaylist': True,
                    **get_ydl_opts_cookies()
                }
                info = run_ytdl(extract_opts, lambda ydl: ydl.extract_info(url, download=False))
                
                raw_formats = info.get('formats', [])
                premerged = [f for f in raw_formats if f.get('vcodec') != 'none' and f.get('acodec') != 'none']
                
                selected_format_id = None
                q_height = int(quality.replace('p', '')) if (quality and quality.replace('p', '').isdigit()) else None
                
                if premerged:
                    filtered_ext = [f for f in premerged if f.get('ext') == ext]
                    if filtered_ext:
                        premerged = filtered_ext
                    
                    if q_height:
                        matched_q = [f for f in premerged if f.get('height') == q_height or f.get('width') == q_height]
                        if matched_q:
                            matched_q.sort(key=lambda x: x.get('tbr') or 0, reverse=True)
                            selected_format_id = matched_q[0].get('format_id')
                            
                    if not selected_format_id:
                        premerged.sort(key=lambda x: (x.get('height') or 0) * (x.get('width') or 0), reverse=True)
                        selected_format_id = premerged[0].get('format_id')
                
                if not selected_format_id:
                    selected_format_id = 'best'
                    
                ydl_opts = {
                    'format': selected_format_id,
                    'outtmpl': output_tmpl,
                    **get_ydl_opts_cookies()
                }

        run_ytdl(ydl_opts, lambda ydl: ydl.download([url]))

        # Locate the downloaded file
        prefix = f"audio_{timestamp}" if media_type == 'audio' else f"video_{timestamp}"
        downloaded_filename = None
        for file in os.listdir(DOWNLOADS_DIR):
            if file.startswith(prefix):
                downloaded_filename = file
                break

        if not downloaded_filename:
            raise Exception("Downloaded file not found on disk")

        download_url = f"{request.url_root}downloads/{downloaded_filename}"

        return jsonify({
            'success': True,
            'downloadUrl': download_url
        })

    except Exception as e:
        print(f"Error in download: {e}")
        error_resp = handle_ytdl_error(e)
        if error_resp:
            return error_resp
        return jsonify({
            'error': 'Download failed',
            'details': str(e)
        }), 500

# ===============================
# GEMINI SEO INSIGHTS
# ===============================

@app.route('/api/seo-insights', methods=['POST'])
def seo_insights():
    try:
        data = request.json or {}
        title = data.get('title')
        if not title:
            return jsonify({'error': 'Title required'}), 400

        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            # Fallback mock data if API key is not present
            time.sleep(1.0)
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
                'titleAnalysis': "Excellent title structure with strong keywords, but can be improved with emotional triggers.",
                'uploadDate': "June 19, 2026"
            })

        # Call Gemini using Google GenAI library
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
                        'tags': types.Schema(
                            type=types.Type.ARRAY,
                            items=types.Schema(type=types.Type.STRING)
                        ),
                        'description': types.Schema(type=types.Type.STRING),
                        'seoScore': types.Schema(type=types.Type.INTEGER),
                        'viralPotential': types.Schema(type=types.Type.STRING),
                        'trendingScore': types.Schema(type=types.Type.INTEGER),
                        'category': types.Schema(type=types.Type.STRING),
                        'suggestedKeywords': types.Schema(
                            type=types.Type.ARRAY,
                            items=types.Schema(type=types.Type.STRING)
                        ),
                        'bestHashtags': types.Schema(
                            type=types.Type.ARRAY,
                            items=types.Schema(type=types.Type.STRING)
                        ),
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

        result = json.loads(response.text)
        return jsonify(result)

    except Exception as e:
        print(f"Error in seo-insights: {e}")
        return jsonify({
            'error': 'SEO generation failed',
            'details': str(e)
        }), 500

# ===============================
# BACKGROUND CLEANUP
# ===============================

def cleanup_loop():
    while True:
        try:
            now = time.time()
            if os.path.exists(DOWNLOADS_DIR):
                for file in os.listdir(DOWNLOADS_DIR):
                    filepath = os.path.join(DOWNLOADS_DIR, file)
                    if os.path.isfile(filepath):
                        # Delete files older than 1 hour (3600 seconds)
                        if now - os.path.getmtime(filepath) > 3600:
                            os.remove(filepath)
                            print(f"Cleaned up old download file: {file}")
        except Exception as e:
            print(f"Error in background cleanup: {e}")
        time.sleep(600)  # Run cleanup every 10 minutes

# Start background thread
cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
cleanup_thread.start()

if __name__ == '__main__':
    # Run server locally on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)