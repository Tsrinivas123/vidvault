// services/youtubeService.ts
const API_BASE_URL = 'https://vidvault-backend-n3wb.onrender.com/api';


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
  url: string;
}

export interface DownloadResponse {
  success: boolean;
  message?: string;
  downloadUrl?: string;
  filename?: string;
  directUrl?: string;
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
      const response = await fetch(directUrl);
      
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
      const chunks: any[] = []; // Fixed: Using any[] to avoid type issues

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

  isValidYouTubeUrl(url: string): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  }
}

export const youtubeService = new YouTubeService();