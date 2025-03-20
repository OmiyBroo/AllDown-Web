#!/bin/bash
set -e

# Download yt-dlp
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /app/bin/yt-dlp
chmod a+rx /app/bin/yt-dlp

# Create downloads directory
mkdir -p /app/downloads
chmod 777 /app/downloads 