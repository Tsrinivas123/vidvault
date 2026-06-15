/* Custom Premium Vanilla JavaScript Logic for VidVault */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    let activeVideoData = null;
    let progressInterval = null;
    let seoDataCached = null;
    
    // User selections
    let selectedVideoFormat = 'mp4';
    let selectedVideoQuality = '720p';
    let selectedAudioFormat = 'mp3';
    let selectedAudioQuality = '320kbps';

    // Element selections
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const faqItems = document.querySelectorAll('.faq-item');
    const spaceBackground = document.querySelector('.space-background');
    
    const urlInput = document.getElementById('url-input');
    const processBtn = document.getElementById('process-btn');
    const btnText = document.getElementById('btn-text');
    const btnLoader = document.getElementById('btn-loader');
    
    const videoCardContainer = document.getElementById('video-card-container');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');
    const videoDuration = document.getElementById('video-duration');
    const downloadAllBtn = document.getElementById('download-all-btn');
    
    // Tabs & Dynamic Selection grids
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const videoFormatsGrid = document.getElementById('video-formats');
    const videoQualitiesGrid = document.getElementById('video-qualities');
    const audioFormatsGrid = document.getElementById('audio-formats');
    const audioQualitiesGrid = document.getElementById('audio-qualities');
    
    const downloadVideoBtn = document.getElementById('download-video-btn');
    const downloadAudioBtn = document.getElementById('download-audio-btn');
    
    const progressBox = document.getElementById('progress-box');
    const progressLabel = document.getElementById('progress-label');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPct = document.getElementById('progress-pct');
    
    const seoSection = document.getElementById('seo-section');
    const seoTriggerBtn = document.getElementById('seo-trigger-btn');
    const seoLoader = document.getElementById('seo-loader');
    const seoResults = document.getElementById('seo-results');
    const seoOptTitle = document.getElementById('seo-opt-title');
    const seoTags = document.getElementById('seo-tags');
    const seoDesc = document.getElementById('seo-desc');

    /* ==========================================================================
       DYNAMIC STAR BACKGROUND GENERATION
       ========================================================================== */
    if (spaceBackground) {
        const numStars = 40;
        for (let i = 0; i < numStars; i++) {
            const star = document.createElement('div');
            star.classList.add('star');
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            const size = Math.random() * 2 + 1;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.animationDelay = `${Math.random() * 3}s`;
            star.style.animationDuration = `${Math.random() * 3 + 2}s`;
            spaceBackground.appendChild(star);
        }
    }

    /* ==========================================================================
       UI INTERACTIVITY (Menu, FAQ Accordions, and Tab Selector)
       ========================================================================== */
    // Mobile Menu
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = mobileMenu.classList.toggle('open');
            mobileMenuBtn.innerHTML = isOpen 
                ? `<svg class="arrow-icon" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>` 
                : `<svg class="arrow-icon" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`;
        });
    }

    // FAQ Accordion
    faqItems.forEach(item => {
        const trigger = item.querySelector('.faq-trigger');
        if (trigger) {
            trigger.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                faqItems.forEach(otherItem => otherItem.classList.remove('open'));
                if (!isOpen) {
                    item.classList.add('open');
                }
            });
        }
    });

    // Tab Selector Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Toggle active tab buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Toggle active tab contents
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${targetTab}-tab-content`) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Static Audio Option Selections
    if (audioFormatsGrid) {
        const formatPills = audioFormatsGrid.querySelectorAll('.option-pill');
        formatPills.forEach(pill => {
            pill.addEventListener('click', () => {
                selectedAudioFormat = pill.getAttribute('data-value');
                formatPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            });
        });
    }

    if (audioQualitiesGrid) {
        const qualityPills = audioQualitiesGrid.querySelectorAll('.option-pill');
        qualityPills.forEach(pill => {
            pill.addEventListener('click', () => {
                selectedAudioQuality = pill.getAttribute('data-value');
                qualityPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            });
        });
    }

    /* ==========================================================================
       YOUTUBE URL VALIDATION & UTILITIES
       ========================================================================== */
    function isValidYouTubeUrl(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        return youtubeRegex.test(url);
    }

    function formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /* ==========================================================================
       DOWNLOAD PROCESS FLOW
       ========================================================================== */
    // Trigger extraction on Enter key
    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            processVideoLink();
        }
    });

    processBtn.addEventListener('click', processVideoLink);

    async function processVideoLink() {
        const url = urlInput.value.trim();
        if (!url) return;

        if (!isValidYouTubeUrl(url)) {
            alert('Please paste a valid YouTube URL.');
            return;
        }

        // Enter loading state
        setFormLoading(true);
        videoCardContainer.style.display = 'none';
        seoSection.style.display = 'none';
        seoDataCached = null;

        try {
            const response = await fetch('/api/video-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to fetch video info');
            }

            const data = await response.json();
            activeVideoData = {
                url: url,
                title: data.title,
                thumbnail: data.thumbnail,
                duration: formatDuration(data.duration),
                formats: data.formats
            };

            renderVideoCard(activeVideoData);
        } catch (err) {
            console.error(err);
            alert(`Error processing video: ${err.message}`);
        } finally {
            setFormLoading(false);
        }
    }

    function setFormLoading(isLoading) {
        if (isLoading) {
            processBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'flex';
        } else {
            processBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    }

    /* ==========================================================================
       RENDER VIDEO METADATA CARD (Options Populator)
       ========================================================================== */
    function renderVideoCard(data) {
        videoThumbnail.src = data.thumbnail;
        videoTitle.textContent = data.title;
        videoDuration.textContent = data.duration;

        // Reset to default tab selections
        selectedVideoFormat = 'mp4';
        selectedAudioFormat = 'mp3';
        selectedAudioQuality = '320kbps';
        
        // Reset Tab UI back to default 'Video' selected
        tabBtns.forEach(b => b.classList.remove('active'));
        tabBtns[0].classList.add('active');
        tabContents.forEach(c => c.classList.remove('active'));
        tabContents[0].classList.add('active');

        // Populate Video Formats (MP4, WEBM)
        videoFormatsGrid.innerHTML = '';
        ['mp4', 'webm'].forEach(ext => {
            const btn = document.createElement('button');
            btn.className = `option-pill ${ext === selectedVideoFormat ? 'active' : ''}`;
            btn.textContent = ext.toUpperCase();
            btn.addEventListener('click', () => {
                selectedVideoFormat = ext;
                videoFormatsGrid.querySelectorAll('.option-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            videoFormatsGrid.appendChild(btn);
        });

        // Populate Video Qualities (360p, 480p, 720p, 1080p)
        videoQualitiesGrid.innerHTML = '';
        const standardQualities = ['1080p', '720p', '480p', '360p'];
        const availableQualities = data.formats.map(f => f.quality);
        
        // Pre-select best quality present in video metadata
        let bestQuality = '720p';
        for (let q of standardQualities) {
            if (availableQualities.includes(q)) {
                bestQuality = q;
                break;
            }
        }
        selectedVideoQuality = bestQuality;

        standardQualities.forEach(q => {
            const btn = document.createElement('button');
            btn.className = `option-pill ${q === selectedVideoQuality ? 'active' : ''}`;
            btn.textContent = q;
            btn.addEventListener('click', () => {
                selectedVideoQuality = q;
                videoQualitiesGrid.querySelectorAll('.option-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            videoQualitiesGrid.appendChild(btn);
        });

        // Show the card container
        videoCardContainer.style.display = 'block';
        videoCardContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /* ==========================================================================
       TRIGGER LOCAL SERVER DOWNLOAD & PROGRESS SIMULATION
       ========================================================================== */
    async function triggerDownload(quality, isAudio, format) {
        if (!activeVideoData) return;

        // Reset & start progress bar
        startProgress(isAudio ? `${format.toUpperCase()} (${quality})` : `${quality} (${format.toUpperCase()})`);
        toggleFormatButtons(true);

        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: activeVideoData.url,
                    quality: quality,
                    type: isAudio ? 'audio' : 'video',
                    format: format
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Server download error');
            }

            const result = await response.json();
            finishProgress();

            if (result.downloadUrl) {
                // Create clean link injection to download file
                const dlLink = document.createElement('a');
                dlLink.href = result.downloadUrl;
                dlLink.download = '';
                document.body.appendChild(dlLink);
                dlLink.click();
                document.body.removeChild(dlLink);
            }
        } catch (err) {
            console.error(err);
            alert(`Download failed: ${err.message}`);
            resetProgress();
        } finally {
            toggleFormatButtons(false);
        }
    }

    function toggleFormatButtons(disabled) {
        const pills = document.querySelectorAll('.option-pill');
        pills.forEach(p => p.disabled = disabled);
        downloadVideoBtn.disabled = disabled;
        downloadAudioBtn.disabled = disabled;
        downloadAllBtn.disabled = disabled;
    }

    function startProgress(label) {
        progressBox.style.display = 'block';
        progressLabel.textContent = `Downloading ${label}...`;
        progressBarFill.style.width = '0%';
        progressPct.textContent = '0%';

        let percentage = 0;
        clearInterval(progressInterval);
        progressInterval = setInterval(() => {
            if (percentage < 90) {
                percentage += Math.floor(Math.random() * 6) + 2; // Increments by 2-7%
                if (percentage > 90) percentage = 90;
                progressBarFill.style.width = `${percentage}%`;
                progressPct.textContent = `${percentage}%`;
            }
        }, 250);
    }

    function finishProgress() {
        clearInterval(progressInterval);
        progressBarFill.style.width = '100%';
        progressPct.textContent = '100%';
        setTimeout(() => {
            progressBox.style.display = 'none';
        }, 1500);
    }

    function resetProgress() {
        clearInterval(progressInterval);
        progressBox.style.display = 'none';
    }

    // Connect Tab Action Buttons
    downloadVideoBtn.addEventListener('click', () => {
        triggerDownload(selectedVideoQuality, false, selectedVideoFormat);
    });

    downloadAudioBtn.addEventListener('click', () => {
        triggerDownload(selectedAudioQuality, true, selectedAudioFormat);
    });

    // Footer Download All button triggers active selection
    downloadAllBtn.onclick = () => {
        const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
        if (activeTab === 'video') {
            triggerDownload(selectedVideoQuality, false, selectedVideoFormat);
        } else {
            triggerDownload(selectedAudioQuality, true, selectedAudioFormat);
        }
    };

    /* ==========================================================================
       GEMINI SEO INSIGHTS & INTERACTION
       ========================================================================== */
    seoTriggerBtn.addEventListener('click', async () => {
        if (!activeVideoData) return;

        // Toggle SEO section
        if (seoSection.style.display === 'block') {
            seoSection.style.display = 'none';
            return;
        }

        seoSection.style.display = 'block';
        seoSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // If data is already cached, don't refetch
        if (seoDataCached) {
            return;
        }

        // Trigger SEO generation
        seoLoader.style.display = 'flex';
        seoResults.style.display = 'none';

        try {
            const response = await fetch('/api/seo-insights', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: activeVideoData.title
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'SEO generation error');
            }

            const insights = await response.json();
            seoDataCached = insights;
            renderSeoInsights(insights);

        } catch (err) {
            console.error(err);
            seoSection.style.display = 'none';
            alert(`Unable to fetch SEO Insights: ${err.message}`);
        } finally {
            seoLoader.style.display = 'none';
        }
    });

    function renderSeoInsights(insights) {
        seoOptTitle.textContent = insights.optimizedTitle;
        
        // Render tags
        seoTags.innerHTML = '';
        if (insights.tags && Array.isArray(insights.tags)) {
            insights.tags.forEach(tag => {
                const pill = document.createElement('span');
                pill.className = 'seo-tag-pill';
                pill.textContent = tag;
                seoTags.appendChild(pill);
            });
        }

        seoDesc.textContent = insights.description;
        seoResults.style.display = 'flex';
    }

    // Copy handlers
    setupCopyButton('copy-title-btn', () => seoOptTitle.textContent);
    setupCopyButton('copy-tags-btn', () => {
        if (seoDataCached && seoDataCached.tags) {
            return seoDataCached.tags.join(' ');
        }
        return '';
    });
    setupCopyButton('copy-desc-btn', () => seoDesc.textContent);

    function setupCopyButton(btnId, getContentCallback) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                const text = getContentCallback();
                if (!text) return;

                navigator.clipboard.writeText(text).then(() => {
                    // Visual feedback: change icon to a checkmark temporarily
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = `<svg class="copy-icon" viewBox="0 0 24 24" stroke="#22d3ee" fill="none" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                    }, 2000);
                }).catch(err => {
                    console.error('Clipboard copy failed: ', err);
                });
            });
        }
    }
});
