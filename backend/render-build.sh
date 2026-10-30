#!/usr/bin/env bash
# Render Native Environment Build Script for VidVault Backend
set -e

echo "=== VidVault Backend Build Starting ==="

# Upgrade pip
pip install --upgrade pip

# Install Python requirements
pip install -r backend/requirements.txt

mkdir -p "$HOME/bin"
export PATH="$HOME/bin:$PATH"

# Install static FFmpeg on Linux if not available in PATH
if ! command -v ffmpeg &> /dev/null; then
    echo "Installing static FFmpeg for Linux..."
    curl -L https://github.com/eugeneware/ffmpeg-static/releases/download/b4.4.1/linux-x64 -o "$HOME/bin/ffmpeg"
    chmod +x "$HOME/bin/ffmpeg"
    echo "FFmpeg installed successfully at $HOME/bin/ffmpeg"
fi

# Install Node.js 22 LTS on Linux if not available in PATH or < v22
NODE_VER=$(node -v 2>/dev/null | cut -d'.' -f1 | tr -d 'v' || echo "0")
if [ "$NODE_VER" -lt 22 ]; then
    echo "Installing Node.js 22 LTS for Linux (required for yt-dlp JS challenge solving)..."
    curl -fsSL https://nodejs.org/dist/v22.14.0/node-v22.14.0-linux-x64.tar.xz | tar -xJ --strip-components=2 -C "$HOME/bin" node-v22.14.0-linux-x64/bin/node
    chmod +x "$HOME/bin/node"
    echo "Node.js 22 installed successfully at $HOME/bin/node"
fi

echo "=== VidVault Backend Build Complete ==="
