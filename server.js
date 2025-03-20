const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const YTDlpWrap = require('yt-dlp-wrap').default;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initialize yt-dlp with custom path
const ytDlp = new YTDlpWrap({
    binaryPath: '/usr/local/bin/yt-dlp'
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure downloads directory exists
const downloadsDir = path.join(__dirname, 'downloads');
if (!require('fs').existsSync(downloadsDir)) {
    require('fs').mkdirSync(downloadsDir, { recursive: true });
}

// API endpoint to get video information
app.post('/api/video-info', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            throw new Error('URL is required');
        }
        
        console.log('Fetching video info for URL:', url);
        
        // Use exec directly to get video info
        const { stdout } = await execPromise(`yt-dlp -j "${url}"`);
        const info = JSON.parse(stdout);
        
        console.log('Video info received:', info);
        
        if (!info || !info.formats) {
            throw new Error('Failed to get video information');
        }
        
        res.json({
            title: info.title,
            thumbnail: info.thumbnail,
            formats: info.formats
        });
    } catch (error) {
        console.error('Error fetching video info:', error);
        res.status(400).json({ 
            error: error.message || 'Failed to fetch video information'
        });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('start-download', async ({ url, format, quality }) => {
        try {
            if (!url || !quality) {
                throw new Error('URL and quality are required');
            }

            console.log('Starting download:', { url, format, quality });

            const options = {
                format: quality,
                output: path.join(downloadsDir, '%(title)s.%(ext)s'),
                extractAudio: format === 'audio',
                audioFormat: 'mp3',
                progress: true
            };

            const download = await ytDlp.exec(url, options);

            download.on('progress', (progress) => {
                console.log('Download progress:', progress);
                socket.emit('download-progress', {
                    progress: Math.round(progress.percent)
                });
            });

            download.on('close', () => {
                console.log('Download completed');
                socket.emit('download-complete', {
                    downloadUrl: `/downloads/${download.filename}`,
                    filename: download.filename
                });
            });

            download.on('error', (error) => {
                console.error('Download error:', error);
                socket.emit('download-error', { message: error.message });
            });
        } catch (error) {
            console.error('Download start error:', error);
            socket.emit('download-error', { message: error.message });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
