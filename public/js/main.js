const socket = io();
const urlInput = document.getElementById('urlInput');
const fetchBtn = document.getElementById('fetchBtn');
const videoInfo = document.getElementById('videoInfo');
const thumbnail = document.getElementById('thumbnail');
const videoTitle = document.getElementById('videoTitle');
const qualitySelect = document.getElementById('qualitySelect');
const downloadBtn = document.getElementById('downloadBtn');
const progressContainer = document.getElementById('progressContainer');
const progress = document.getElementById('progress');
const progressText = document.getElementById('progressText');
const themeToggle = document.querySelector('.theme-toggle');

// Theme toggle functionality
themeToggle.addEventListener('click', () => {
    document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    const icon = themeToggle.querySelector('i');
    icon.className = document.body.dataset.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
});

// Fetch video information
fetchBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
        alert('Please enter a valid URL');
        return;
    }

    try {
        fetchBtn.disabled = true;
        fetchBtn.textContent = 'Fetching...';
        
        const response = await fetch('/api/video-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        thumbnail.src = data.thumbnail;
        videoTitle.textContent = data.title;
        qualitySelect.innerHTML = '<option value="">Select Quality</option>';
        
        data.formats.forEach(format => {
            const option = document.createElement('option');
            option.value = format.format_id;
            option.textContent = `${format.ext.toUpperCase()} - ${format.format_note || format.height + 'p'}`;
            qualitySelect.appendChild(option);
        });

        videoInfo.style.display = 'grid';
    } catch (error) {
        alert(error.message);
    } finally {
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Fetch Video';
    }
});

// Handle download
downloadBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    const format = document.querySelector('input[name="format"]:checked').value;
    const quality = qualitySelect.value;

    if (!quality) {
        alert('Please select a quality');
        return;
    }

    try {
        downloadBtn.disabled = true;
        progressContainer.style.display = 'block';
        progress.style.width = '0%';
        progressText.textContent = 'Starting download...';

        socket.emit('start-download', { url, format, quality });

        socket.on('download-progress', (data) => {
            progress.style.width = `${data.progress}%`;
            progressText.textContent = `Downloading: ${data.progress}%`;
        });

        socket.on('download-complete', (data) => {
            progressText.textContent = 'Download complete!';
            downloadBtn.disabled = false;
            
            // Create download link
            const link = document.createElement('a');
            link.href = data.downloadUrl;
            link.download = data.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        socket.on('download-error', (error) => {
            alert(error.message);
            downloadBtn.disabled = false;
            progressContainer.style.display = 'none';
        });
    } catch (error) {
        alert(error.message);
        downloadBtn.disabled = false;
        progressContainer.style.display = 'none';
    }
}); 