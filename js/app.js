// js/app.js - VidVault Application Logic & API Integration

(function initVidVaultApp() {
  // ==========================================
  // API URL RESOLVER
  // ==========================================
  function getApiBaseUrl() {
    if (window.VITE_API_URL && window.VITE_API_URL.trim() !== '') {
      return window.VITE_API_URL.replace(/\/+$/, '') + '/api';
    }
    // If running locally on separate test port or file protocol:
    if (
      window.location.protocol === 'file:' ||
      (window.location.hostname === 'localhost' && window.location.port !== '5000') ||
      (window.location.hostname === '127.0.0.1' && window.location.port !== '5000')
    ) {
      return 'http://127.0.0.1:5000/api';
    }
    return '/api';
  }

  function resolveMediaUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
      return url;
    }
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const base = getApiBaseUrl().replace(/\/api$/, '');
    return base ? `${base}${cleanPath}` : cleanPath;
  }

  // ==========================================
  // FORMATTING HELPERS
  // ==========================================
  function formatDuration(seconds) {
    const sec = Number(seconds) || 0;
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const remainingSecs = Math.floor(sec % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSecs.toString().padStart(2, '0')}`;
  }

  function formatFileSize(bytes) {
    if (typeof bytes === 'string' && bytes.trim() !== '') return bytes;
    const num = Number(bytes);
    if (!num || num <= 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(1024));
    return (num / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
  }

  function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = (url || '').trim().match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  let currentVideoData = null;
  let currentAiInsights = null;
  let isDownloading = null;
  let pollInterval = null;

  // DOM Elements
  const urlInput = document.getElementById('url-input');
  const btnProcess = document.getElementById('btn-process');
  const loadingSkeleton = document.getElementById('loading-skeleton');
  const resultsCard = document.getElementById('results-card');

  // Results Sub-Elements
  const videoThumb = document.getElementById('video-thumb');
  const videoDuration = document.getElementById('video-duration');
  const videoTitle = document.getElementById('video-title');
  const videoChannel = document.getElementById('video-channel');
  const videoGrid = document.getElementById('video-formats-grid');
  const audioGrid = document.getElementById('audio-formats-grid');
  const thumbnailGrid = document.getElementById('thumbnail-formats-grid');
  const btnDownloadBest = document.getElementById('btn-download-best');
  const btnQuickThumb = document.getElementById('btn-quick-thumb');

  // Download Progress Sub-Elements
  const downloadStatusBox = document.getElementById('download-status-box');
  const downloadStageText = document.getElementById('download-stage-text');
  const downloadSpeedText = document.getElementById('download-speed-text');
  const downloadEtaText = document.getElementById('download-eta-text');
  const downloadPercentText = document.getElementById('download-percent-text');
  const downloadProgressBar = document.getElementById('download-progress-bar');
  const downloadErrorBox = document.getElementById('download-error-box');
  const downloadErrorMsg = document.getElementById('download-error-msg');
  const btnCloseError = document.getElementById('btn-close-error');

  // AI Insights Sub-Elements
  const btnToggleInsights = document.getElementById('btn-toggle-insights');
  const insightsContainer = document.getElementById('insights-container');
  const insightsLoading = document.getElementById('insights-loading');
  const insightsContent = document.getElementById('insights-content');
  const seoScoreVal = document.getElementById('seo-score-val');
  const seoScoreCircle = document.getElementById('seo-score-circle');
  const trendingScoreVal = document.getElementById('trending-score-val');
  const trendingScoreCircle = document.getElementById('trending-score-circle');
  const viralPotentialVal = document.getElementById('viral-potential-val');
  const viralBadge = document.getElementById('viral-badge');
  const viralBar = document.getElementById('viral-bar');
  const optimizedTitleText = document.getElementById('optimized-title-text');
  const titleAnalysisText = document.getElementById('title-analysis-text');
  const btnCopyTitle = document.getElementById('btn-copy-title');
  const suggestedKeywordsContainer = document.getElementById('suggested-keywords');
  const bestHashtagsContainer = document.getElementById('best-hashtags');
  const insightCategory = document.getElementById('insight-category');
  const insightCreator = document.getElementById('insight-creator');
  const insightDate = document.getElementById('insight-date');
  const insightDuration = document.getElementById('insight-duration');
  const contentSummaryText = document.getElementById('content-summary-text');
  const optimizedDescText = document.getElementById('optimized-desc-text');

  // Action Buttons
  const btnCopyInfo = document.getElementById('btn-copy-info');
  const btnShare = document.getElementById('btn-share');

  // Refresh Lucide Icons helper
  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // ==========================================
  // PROCESS VIDEO URL
  // ==========================================
  async function handleProcess() {
    const inputUrl = (urlInput.value || '').trim();
    const videoId = extractVideoId(inputUrl);

    if (!videoId) {
      alert('Please paste a valid YouTube URL (e.g. https://www.youtube.com/watch?v=...)');
      return;
    }

    // Set UI to loading state
    btnProcess.disabled = true;
    btnProcess.innerHTML = `
      <div class="flex items-center justify-center gap-2">
        <i data-lucide="loader-2" class="w-6 h-6 animate-spin text-white"></i>
        <span>Fetching...</span>
      </div>
    `;
    refreshIcons();

    loadingSkeleton.classList.remove('hidden');
    resultsCard.classList.add('hidden');
    downloadErrorBox.classList.add('hidden');
    downloadStatusBox.classList.add('hidden');

    try {
      const response = await fetch(`${getApiBaseUrl()}/video-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.details || 'Failed to fetch video details.');
      }

      const videoInfo = await response.json();
      const durationSec = videoInfo.duration || 0;

      // Define standard supported tiers
      const standardTiers = [
        { height: 2160, label: '4K (2160p)', q: '2160', sizeFactor: 1.2 },
        { height: 1440, label: '2K (1440p)', q: '1440', sizeFactor: 0.7 },
        { height: 1080, label: '1080p', q: '1080', sizeFactor: 0.4 },
        { height: 720, label: '720p', q: '720', sizeFactor: 0.25 },
        { height: 480, label: '480p', q: '480', sizeFactor: 0.15 },
        { height: 360, label: '360p', q: '360', sizeFactor: 0.10 },
      ];

      const availableHeights = videoInfo.available_heights || [];
      let activeTiers = standardTiers.filter(t => availableHeights.some(h => h >= t.height));
      if (activeTiers.length === 0) {
        activeTiers = standardTiers.filter(t => t.height <= 720);
      }

      const mappedVideoFormats = activeTiers.map(tier => {
        const matched = (videoInfo.formats || []).find(
          f => f.quality === tier.height + 'p' || (f.quality && f.quality.includes(tier.q))
        );
        let sizeStr = '';
        if (matched && matched.filesize) {
          sizeStr = formatFileSize(matched.filesize);
        } else {
          const estBytes = durationSec * tier.sizeFactor * 1024 * 1024;
          sizeStr = formatFileSize(estBytes);
        }
        return {
          label: tier.label,
          quality: tier.q,
          ext: 'MP4',
          size: sizeStr,
          hasAudio: true,
        };
      });

      const audioTiers = [
        { label: 'MP3 320kbps', q: '320kbps', sizeFactor: 0.04, ext: 'MP3' },
        { label: 'MP3 192kbps', q: '192kbps', sizeFactor: 0.024, ext: 'MP3' },
        { label: 'MP3 128kbps', q: '128kbps', sizeFactor: 0.015, ext: 'MP3' },
      ];

      const mappedAudioFormats = audioTiers.map(aud => {
        const estBytes = durationSec * aud.sizeFactor * 1024 * 1024;
        return {
          label: aud.label,
          quality: aud.q,
          ext: aud.ext,
          size: formatFileSize(estBytes),
          hasAudio: false,
        };
      });

      currentVideoData = {
        id: videoId,
        url: inputUrl,
        thumbnail: videoInfo.thumbnail,
        title: videoInfo.title,
        duration: formatDuration(durationSec),
        durationSec: durationSec,
        uploader: videoInfo.uploader || 'YouTube Creator',
        videoFormats: mappedVideoFormats,
        audioFormats: mappedAudioFormats,
      };

      // Populate Video Results Card
      renderVideoResults(currentVideoData);

      // Trigger parallel SEO insights
      fetchSeoInsights(currentVideoData.title);

    } catch (err) {
      console.error('Error fetching video:', err);
      alert('Error fetching video: ' + (err.message || String(err)));
    } finally {
      btnProcess.disabled = false;
      btnProcess.innerHTML = `
        <div class="relative z-20 flex items-center justify-center gap-2 text-white font-bold tracking-wide text-lg h-full">
          <span>Download</span>
          <div class="bg-white/20 p-1.5 rounded-lg group-hover/btn:bg-white/30 transition-colors">
            <i data-lucide="arrow-right" class="w-5 h-5 group-hover/btn:translate-x-1 transition-transform"></i>
          </div>
        </div>
      `;
      loadingSkeleton.classList.add('hidden');
      refreshIcons();
    }
  }

  // ==========================================
  // RENDER VIDEO RESULTS
  // ==========================================
  function renderVideoResults(data) {
    videoThumb.src = data.thumbnail;
    videoThumb.alt = data.title;
    videoDuration.textContent = data.duration;
    videoTitle.textContent = data.title;
    videoChannel.textContent = data.uploader;

    // Render Video Formats Grid
    videoGrid.innerHTML = '';
    data.videoFormats.forEach(fmt => {
      const btn = document.createElement('button');
      btn.className =
        'flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-950/20 hover:shadow-[0_0_15px_-5px_rgba(6,182,212,0.3)] transition-all group relative overflow-hidden cursor-pointer bg-slate-900/40 disabled:opacity-50 disabled:cursor-not-allowed';
      btn.innerHTML = `
        <span class="text-sm font-bold text-slate-100 group-hover:text-cyan-300 z-10 transition-colors">${fmt.label}</span>
        <span class="text-[10px] text-cyan-400/80 font-semibold uppercase tracking-wider z-10">${fmt.ext}</span>
        <span class="text-[10px] text-slate-400 mt-1 font-mono z-10">${fmt.size}</span>
        <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <i data-lucide="download" class="absolute bottom-2 right-2 w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0"></i>
      `;
      btn.onclick = () => handleDownload(fmt, false, btn);
      videoGrid.appendChild(btn);
    });

    // Render Audio Formats Grid
    audioGrid.innerHTML = '';
    data.audioFormats.forEach(fmt => {
      const btn = document.createElement('button');
      btn.className =
        'flex items-center justify-between p-3.5 px-5 rounded-xl border border-white/5 hover:border-purple-500/50 hover:bg-purple-950/20 hover:shadow-[0_0_15px_-5px_rgba(168,85,247,0.3)] transition-all group relative overflow-hidden cursor-pointer bg-slate-900/40 disabled:opacity-50 disabled:cursor-not-allowed';
      btn.innerHTML = `
        <div class="flex items-center gap-3 z-10">
          <div class="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-all">
            <i data-lucide="music" class="w-4 h-4"></i>
          </div>
          <div class="text-left">
            <span class="text-sm font-bold text-slate-100 group-hover:text-purple-300 transition-colors block">${fmt.label}</span>
            <span class="text-[10px] text-slate-400 font-mono">${fmt.size}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 z-10 text-purple-400/80 group-hover:text-purple-300 transition-colors">
          <span class="text-xs font-semibold uppercase tracking-wider">${fmt.ext}</span>
          <i data-lucide="download" class="w-4 h-4 group-hover:translate-y-0.5 transition-transform"></i>
        </div>
        <div class="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      `;
      btn.onclick = () => handleDownload(fmt, true, btn);
      audioGrid.appendChild(btn);
    });

    // Render Thumbnail Formats Grid
    if (thumbnailGrid) {
      thumbnailGrid.innerHTML = '';
      const thumbTiers = [
        { label: 'Ultra HD (1080p)', quality: 'maxres', res: '1920 × 1080', ext: 'JPG' },
        { label: 'Standard HD (720p)', quality: 'sd', res: '1280 × 720', ext: 'JPG' },
        { label: 'High Quality (480p)', quality: 'hq', res: '640 × 480', ext: 'JPG' },
      ];

      thumbTiers.forEach(t => {
        const btn = document.createElement('button');
        btn.className =
          'flex items-center justify-between p-3.5 px-5 rounded-xl border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-950/20 hover:shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)] transition-all group relative overflow-hidden cursor-pointer bg-slate-900/40';
        btn.innerHTML = `
          <div class="flex items-center gap-3 z-10">
            <div class="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
              <i data-lucide="image" class="w-4 h-4"></i>
            </div>
            <div class="text-left">
              <span class="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors block">${t.label}</span>
              <span class="text-[10px] text-slate-400 font-mono">${t.res}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 z-10 text-emerald-400/80 group-hover:text-emerald-300 transition-colors">
            <span class="text-xs font-semibold uppercase tracking-wider">${t.ext}</span>
            <i data-lucide="download" class="w-4 h-4 group-hover:translate-y-0.5 transition-transform"></i>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        `;
        btn.onclick = () => handleDownloadThumbnail(t.quality, t.label);
        thumbnailGrid.appendChild(btn);
      });
    }

    // Quick Thumbnail Button
    if (btnQuickThumb) {
      btnQuickThumb.onclick = () => handleDownloadThumbnail('maxres', 'HD');
    }

    // Best Video Button handler
    btnDownloadBest.onclick = () => {
      if (data.videoFormats && data.videoFormats.length > 0) {
        handleDownload(data.videoFormats[0], false, btnDownloadBest);
      }
    };

    resultsCard.classList.remove('hidden');
    refreshIcons();
  }

  // ==========================================
  // THUMBNAIL DOWNLOAD HANDLER
  // ==========================================
  function handleDownloadThumbnail(quality, label) {
    if (!currentVideoData) return;
    const title = encodeURIComponent(currentVideoData.title || 'thumbnail');
    const thumbUrl = `${getApiBaseUrl()}/download-thumbnail?id=${currentVideoData.id}&quality=${quality}&title=${title}`;
    const link = document.createElement('a');
    link.href = thumbUrl;
    const safeTitle = (currentVideoData.title || 'thumbnail').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    link.download = `${safeTitle}_thumbnail_${quality}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==========================================
  // DOWNLOAD INITIATION & PROGRESS POLLING
  // ==========================================
  async function handleDownload(format, isAudio, triggerBtn) {
    if (!currentVideoData || isDownloading) return;

    isDownloading = true;
    downloadErrorBox.classList.add('hidden');
    downloadStatusBox.classList.remove('hidden');

    // Reset progress UI
    downloadProgressBar.style.width = '2%';
    downloadPercentText.textContent = '2%';
    downloadSpeedText.textContent = '';
    downloadEtaText.textContent = '';
    downloadStageText.textContent = isAudio ? 'Downloading audio...' : 'Downloading video...';

    // Disable all download buttons while one is in progress
    document.querySelectorAll('#video-formats-grid button, #audio-formats-grid button, #btn-download-best').forEach(b => {
      b.disabled = true;
    });

    const download_id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'dl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Poll status every second
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/download/status/${download_id}`);
        if (res.ok) {
          const status = await res.json();
          if (status.percent !== undefined) {
            const pct = Math.max(2, Math.round(status.percent));
            downloadProgressBar.style.width = `${pct}%`;
            downloadPercentText.textContent = `${pct}%`;
          }
          if (status.stage) downloadStageText.textContent = status.stage;
          if (status.speed) downloadSpeedText.textContent = `(${status.speed})`;
          if (status.eta) downloadEtaText.textContent = `ETA: ${status.eta}`;

          if (status.status === 'complete' || status.status === 'error') {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
      } catch {
        // ignore polling network errors
      }
    }, 1000);

    try {
      const qVal = isAudio ? format.quality.replace('kbps', '') : format.quality;
      const typeVal = isAudio ? 'audio' : 'video';
      const fmtVal = isAudio ? 'mp3' : 'mp4';

      const response = await fetch(`${getApiBaseUrl()}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: currentVideoData.url,
          quality: qVal,
          type: typeVal,
          format: fmtVal,
          download_id: download_id,
        }),
      });

      if (!response.ok) {
        let errJson = {};
        try {
          errJson = await response.json();
        } catch {
          // ignore json parse error
        }
        const msg = errJson.details || errJson.error || `Download failed with HTTP ${response.status}`;
        throw new Error(msg);
      }

      const resData = await response.json();

      downloadProgressBar.style.width = '100%';
      downloadPercentText.textContent = '100%';
      downloadStageText.textContent = 'Download Complete! Delivering file...';

      if (resData.success && resData.downloadUrl) {
        const link = document.createElement('a');
        link.href = resolveMediaUrl(resData.downloadUrl);
        const safeTitle = currentVideoData.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        link.download = `${safeTitle}_${isAudio ? format.quality : format.label}.${fmtVal}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('No valid download URL received from server.');
      }

      setTimeout(() => {
        downloadStatusBox.classList.add('hidden');
        downloadProgressBar.style.width = '0%';
      }, 2500);

    } catch (err) {
      console.error('Download error:', err);
      const errMsg = err.message || String(err);
      downloadErrorMsg.textContent = errMsg.startsWith('Download failed') ? errMsg : `Download failed: ${errMsg}`;
      downloadErrorBox.classList.remove('hidden');
      downloadStatusBox.classList.add('hidden');
    } finally {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      isDownloading = null;
      document.querySelectorAll('#video-formats-grid button, #audio-formats-grid button, #btn-download-best').forEach(b => {
        b.disabled = false;
      });
      refreshIcons();
    }
  }

  // ==========================================
  // AI CONTENT INSIGHTS
  // ==========================================
  async function fetchSeoInsights(title) {
    insightsLoading.classList.remove('hidden');
    insightsContent.classList.add('hidden');

    try {
      const response = await fetch(`${getApiBaseUrl()}/seo-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title }),
      });

      if (!response.ok) {
        throw new Error('SEO insights endpoint returned non-200');
      }

      const insights = await response.json();
      currentAiInsights = insights;
      renderSeoInsights(insights);

    } catch (err) {
      console.warn('Using client-side smart fallback insights:', err);
      const fallbackInsights = {
        optimizedTitle: `Ultimate Guide: ${title} (2026 Tutorial)`,
        tags: ['#viral', '#guide', '#tutorial', '#tech', '#2026'],
        description: `In this video, we explore ${title}. We cover all the key topics and walk through them step by step. Perfect for beginners and advanced viewers alike.`,
        seoScore: 85,
        viralPotential: 'Medium',
        trendingScore: 78,
        category: 'Education',
        suggestedKeywords: ['tutorial', 'guide', 'how-to', 'video info', 'learning'],
        bestHashtags: ['#tutorial', '#guide', '#youtube'],
        contentSummary: 'A comprehensive video guide focusing on tips, tricks, and best practices.',
        titleAnalysis: 'Good title with search keywords, though it could benefit from an exclamation or emotional trigger.',
        uploadDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      };
      currentAiInsights = fallbackInsights;
      renderSeoInsights(fallbackInsights);
    } finally {
      insightsLoading.classList.add('hidden');
      insightsContent.classList.remove('hidden');
      refreshIcons();
    }
  }

  function renderSeoInsights(insights) {
    seoScoreVal.textContent = `${insights.seoScore}%`;
    const seoOffset = 251.2 * (1 - (insights.seoScore || 85) / 100);
    seoScoreCircle.setAttribute('stroke-dashoffset', seoOffset);

    trendingScoreVal.textContent = `${insights.trendingScore}%`;
    const trendOffset = 251.2 * (1 - (insights.trendingScore || 75) / 100);
    trendingScoreCircle.setAttribute('stroke-dashoffset', trendOffset);

    viralPotentialVal.textContent = insights.viralPotential;
    viralBadge.textContent = `${insights.viralPotential} Range`;

    if (insights.viralPotential === 'High') {
      viralBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border bg-rose-500/10 border-rose-500/20 text-rose-400';
      viralBar.className = 'h-full transition-all duration-1000 bg-gradient-to-r from-purple-500 to-rose-500 w-[90%]';
    } else if (insights.viralPotential === 'Medium') {
      viralBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border bg-amber-500/10 border-amber-500/20 text-amber-400';
      viralBar.className = 'h-full transition-all duration-1000 bg-gradient-to-r from-blue-500 to-amber-500 w-[60%]';
    } else {
      viralBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border bg-slate-500/10 border-slate-500/20 text-slate-400';
      viralBar.className = 'h-full transition-all duration-1000 bg-gradient-to-r from-blue-500 to-cyan-500 w-[30%]';
    }

    optimizedTitleText.textContent = `"${insights.optimizedTitle}"`;
    titleAnalysisText.textContent = `💡 ${insights.titleAnalysis || 'High-performing title structure optimized for search rankings.'}`;

    suggestedKeywordsContainer.innerHTML = (insights.suggestedKeywords || [])
      .map(
        kw => `<span class="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300 transition-colors cursor-default">${kw}</span>`
      )
      .join('');

    bestHashtagsContainer.innerHTML = (insights.bestHashtags || [])
      .map(
        ht => `<span class="text-xs px-2.5 py-1 rounded-lg bg-purple-500/5 border border-purple-500/10 text-purple-300 hover:border-purple-500/30 hover:text-purple-300 transition-colors cursor-default">${ht}</span>`
      )
      .join('');

    insightCategory.textContent = insights.category || 'General';
    insightCreator.textContent = currentVideoData ? currentVideoData.uploader : 'YouTube Creator';
    insightDate.textContent = insights.uploadDate || new Date().toLocaleDateString('en-US');
    insightDuration.textContent = currentVideoData ? currentVideoData.duration : '0:00';

    contentSummaryText.textContent = insights.contentSummary || '';
    optimizedDescText.textContent = insights.description || '';
  }

  // ==========================================
  // EVENT LISTENERS & INTERACTION HANDLERS
  // ==========================================

  // Process video on button click or Enter key
  btnProcess.addEventListener('click', handleProcess);
  urlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleProcess();
  });

  // Close error banner
  btnCloseError.addEventListener('click', () => {
    downloadErrorBox.classList.add('hidden');
  });

  // Toggle AI Insights accordion
  btnToggleInsights.addEventListener('click', () => {
    insightsContainer.classList.toggle('hidden');
    const isHidden = insightsContainer.classList.contains('hidden');
    btnToggleInsights.querySelector('span').textContent = isHidden ? 'Show AI Insights' : 'Hide AI Insights';
    const chevronIcon = btnToggleInsights.querySelector('.chevron-icon');
    if (chevronIcon) {
      chevronIcon.setAttribute('data-lucide', isHidden ? 'chevron-down' : 'chevron-up');
      refreshIcons();
    }
  });

  // Copy Video Information
  btnCopyInfo.addEventListener('click', () => {
    if (!currentVideoData) return;
    let infoText = `🎥 VidVault Video Summary 🎥\n------------------------------------\nTitle: ${currentVideoData.title}\nChannel: ${currentVideoData.uploader}\nDuration: ${currentVideoData.duration}\nURL: ${currentVideoData.url}\n`;
    if (currentAiInsights) {
      infoText += `------------------------------------\n🤖 AI Optimized Title: ${currentAiInsights.optimizedTitle}\nCategory: ${currentAiInsights.category}\nSEO Score: ${currentAiInsights.seoScore}/100\nSummary: ${currentAiInsights.contentSummary}\nTags: ${(currentAiInsights.tags || []).join(', ')}\n`;
    }
    navigator.clipboard.writeText(infoText).then(() => {
      btnCopyInfo.innerHTML = '<i data-lucide="check" class="w-4 h-4 text-emerald-400"></i>';
      refreshIcons();
      setTimeout(() => {
        btnCopyInfo.innerHTML = '<i data-lucide="copy" class="w-4 h-4"></i>';
        refreshIcons();
      }, 2000);
    });
  });

  // Share
  btnShare.addEventListener('click', () => {
    if (navigator.share && currentVideoData) {
      navigator.share({
        title: currentVideoData.title,
        text: 'Check out this YouTube downloader & AI Insights tool!',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        btnShare.innerHTML = '<i data-lucide="check" class="w-4 h-4 text-emerald-400"></i>';
        refreshIcons();
        setTimeout(() => {
          btnShare.innerHTML = '<i data-lucide="share-2" class="w-4 h-4"></i>';
          refreshIcons();
        }, 2000);
      });
    }
  });

  // Copy Optimized Title
  btnCopyTitle.addEventListener('click', () => {
    if (currentAiInsights && currentAiInsights.optimizedTitle) {
      navigator.clipboard.writeText(currentAiInsights.optimizedTitle).then(() => {
        alert('Optimized title copied to clipboard!');
      });
    }
  });

  // Mobile Menu Toggle
  const btnMobileMenu = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (btnMobileMenu && mobileMenu) {
    btnMobileMenu.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
      const isExpanded = !mobileMenu.classList.contains('hidden');
      btnMobileMenu.innerHTML = isExpanded
        ? '<i data-lucide="x" class="block h-6 w-6"></i>'
        : '<i data-lucide="menu" class="block h-6 w-6"></i>';
      refreshIcons();
    });
  }

  // FAQ Accordion
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-btn');
    const answer = item.querySelector('.faq-answer');
    const icon = item.querySelector('.faq-icon');

    if (btn && answer && icon) {
      btn.addEventListener('click', () => {
        const isClosed = answer.classList.contains('hidden');
        // Close others
        document.querySelectorAll('.faq-answer').forEach(a => a.classList.add('hidden'));
        document.querySelectorAll('.faq-icon').forEach(ic => {
          ic.setAttribute('data-lucide', 'chevron-down');
        });

        if (isClosed) {
          answer.classList.remove('hidden');
          icon.setAttribute('data-lucide', 'chevron-up');
        }
        refreshIcons();
      });
    }
  });

  // Initial Lucide Icons execution
  refreshIcons();
})();

