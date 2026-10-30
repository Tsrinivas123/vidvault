# VidVault Production Backend Dockerfile
FROM python:3.11-slim

# Install system dependencies: FFmpeg, curl, ca-certificates, and Node.js 22 LTS
# (yt-dlp requires Node.js >= 22.0.0 for JavaScript player cipher / challenge solving)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    ca-certificates \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
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
