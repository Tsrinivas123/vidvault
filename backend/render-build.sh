#!/usr/bin/env bash
# Render Native Environment Build Script for VidVault Backend
set -e

echo "=== VidVault Backend Build Starting ==="

# Upgrade pip
pip install --upgrade pip

# Install Python requirements
pip install -r backend/requirements.txt

# Install static FFmpeg on Linux if not available in PATH
if ! command -v ffmpeg &> /dev/null; then
    echo "Installing static FFmpeg for Linux..."
    mkdir -p "$HOME/bin"
    curl -L https://github.com/eugeneware/ffmpeg-static/releases/download/b4.4.1/linux-x64 -o "$HOME/bin/ffmpeg"
    chmod +x "$HOME/bin/ffmpeg"
    export PATH="$HOME/bin:$PATH"
    echo "FFmpeg installed successfully at $HOME/bin/ffmpeg"
fi

echo "=== VidVault Backend Build Complete ==="
