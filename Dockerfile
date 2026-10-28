# VidVault Production Backend Dockerfile
FROM python:3.11-slim

# Install system dependencies: FFmpeg, Node.js (for YouTube JS cipher decryption), and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    nodejs \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first for caching
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend application source code
COPY backend ./backend

# Default port
ENV PORT=5000
EXPOSE 5000

# Start Gunicorn with 1 worker and 4 threads (optimal for shared memory download tracking & 512MB RAM)
# 300-second timeout to support large 1080p/4K downloads
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 1 --threads 4 --timeout 300 backend.app:app"]

