// services/youtubeService.ts
export const BACKEND_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const API_BASE_URL = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

/**
 * Resolves a download URL (which may be relative like '/downloads/...' or absolute)
 * to the proper backend domain in production.
 */
export function resolveMediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return BACKEND_URL ? `${BACKEND_URL}${cleanPath}` : cleanPath;
}


export interface VideoFormat {
  format_id: string;
  quality: string;
  ext: string;
  filesize: number | string;
  fps: number;
}

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  view_count: number;
  formats: VideoFormat[];
  available_heights: number[];   // NEW: all truly available heights (video-only + merged)
  url: string;
}

export interface DownloadResponse {
  success: boolean;
  message?: string;
  downloadUrl?: string;
  filename?: string;
  filesize?: number;
  directUrl?: string;
}

export interface DownloadStatus {
  status: 'starting' | 'downloading' | 'processing' | 'complete' | 'error' | 'unknown';
  percent: number;
  stage?: string;
  speed?: string;
  eta?: string;
  filename?: string;
  filesize?: number;
  downloadUrl?: string;
  error?: string;
}

class YouTubeService {
  async getVideoInfo(url: string): Promise<VideoInfo> {
    try {
      const response = await fetch(`${API_BASE_URL}/video-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch video information');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching video info:', error);
      throw error;
    }
  }

  async getDownloadLink(url: string, quality?: string): Promise<DownloadResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/get-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, quality }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get download link');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting download link:', error);
      throw error;
    }
  }

  async downloadWithProgress(
    directUrl: string,
    filename: string,
    onProgress: (progress: number) => void
  ): Promise<void> {
    try {
      const targetUrl = resolveMediaUrl(directUrl);
      const response = await fetch(targetUrl);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported');
      }

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      let receivedLength = 0;
      const chunks: any[] = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        if (total > 0) {
          const progress = Math.round((receivedLength / total) * 100);
          onProgress(progress);
        }
      }

      const blob = new Blob(chunks);
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);
      onProgress(100);
    } catch (error) {
      console.error('Error during download:', error);
      throw error;
    }
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  formatFileSize(bytes: number | string): string {
    if (typeof bytes === 'string') return bytes;
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  async getSeoInsights(title: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/seo-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch SEO insights');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching SEO insights:', error);
      throw error;
    }
  }

  /**
   * Download a video/audio file.
   * Accepts an optional download_id for progress polling.
   * Polls /api/download/status/<download_id> every second when download_id is provided.
   */
  async downloadVideo(
    url: string,
    quality: string,
    type: 'video' | 'audio',
    format: string,
    download_id?: string,
    onProgress?: (status: DownloadStatus) => void
  ): Promise<DownloadResponse> {
    // Start polling if we have an id and a progress callback
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    if (download_id && onProgress) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/download/status/${download_id}`);
          if (res.ok) {
            const status: DownloadStatus = await res.json();
            onProgress(status);
            // Stop polling once terminal states are reached
            if (status.status === 'complete' || status.status === 'error') {
              if (pollInterval) clearInterval(pollInterval);
              pollInterval = null;
            }
          }
        } catch {
          // swallow polling errors silently
        }
      }, 1000);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, quality, type, format, download_id }),
      });

      if (!response.ok) {
        let errJson: any = {};
        try {
          errJson = await response.json();
        } catch {
          // ignore json parse error
        }
        const msg = errJson.details || errJson.error || `Download request failed with status ${response.status}`;
        throw new Error(msg);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in download:', error);
      // Resilience check: if backend finished despite network/proxy timeout
      if (download_id) {
        try {
          const finalStatus = await this.getDownloadStatus(download_id);
          if (finalStatus.status === 'complete' && finalStatus.downloadUrl) {
            return {
              success: true,
              downloadUrl: finalStatus.downloadUrl,
              filename: finalStatus.filename,
              filesize: finalStatus.filesize
            };
          }
        } catch {
          // ignore status lookup error
        }
      }
      throw error;
    } finally {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }
  }

  async getDownloadStatus(download_id: string): Promise<DownloadStatus> {
    const res = await fetch(`${API_BASE_URL}/download/status/${download_id}`);
    if (!res.ok) return { status: 'unknown', percent: 0 };
    return res.json();
  }

  isValidYouTubeUrl(url: string): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  }
}

export const youtubeService = new YouTubeService();
