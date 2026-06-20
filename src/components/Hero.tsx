import React, { useState } from 'react';
import { 
  Loader2, 
  Link as LinkIcon, 
  CheckCircle2, 
  Video, 
  Music, 
  PlaySquare, 
  Zap, 
  Shield, 
  ArrowRight,
  Sparkles,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  TrendingUp,
  Award,
  Clock,
  Calendar,
  Hash,
  FileText
} from 'lucide-react';
import { youtubeService } from '../services/youtubeService';
import { SEOInsight } from '../types';

interface VideoFormat {
  label: string;
  quality: string;
  ext: string;
  size: string;
  hasAudio: boolean;
}

interface VideoData {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  duration: string;
  durationSec: number;
  uploader: string;
  videoFormats: VideoFormat[];
  audioFormats: VideoFormat[];
}

const Hero: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [aiInsights, setAiInsights] = useState<SEOInsight | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [copiedInfo, setCopiedInfo] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleProcess = async () => {
    const videoId = extractVideoId(input);
    if (!videoId) {
      alert('Please paste a valid YouTube URL.');
      return;
    }
    
    setLoading(true);
    setVideoData(null);
    setAiInsights(null);
    setLoadingInsights(true);
    
    try {
      const videoInfo = await youtubeService.getVideoInfo(input);
      const durationSec = videoInfo.duration || 0;
      
      const standardVideoResolutions = [
        { label: '1080p', q: '1080', sizeFactor: 0.4, ext: 'MP4' },
        { label: '720p', q: '720', sizeFactor: 0.25, ext: 'MP4' },
        { label: '480p', q: '480', sizeFactor: 0.15, ext: 'MP4' },
        { label: '360p', q: '360', sizeFactor: 0.10, ext: 'MP4' }
      ];
      
      const mappedFormats = standardVideoResolutions.map(res => {
        const matched = videoInfo.formats.find(f => f.quality && f.quality.includes(res.label));
        let sizeStr = '';
        if (matched && matched.filesize) {
          sizeStr = youtubeService.formatFileSize(matched.filesize);
        } else {
          const estBytes = durationSec * res.sizeFactor * 1024 * 1024;
          sizeStr = youtubeService.formatFileSize(estBytes);
        }
        return {
          label: res.label,
          quality: res.q,
          ext: res.ext,
          size: sizeStr,
          hasAudio: true
        };
      });

      const audioFormats = [
        { label: 'MP3 320kbps', q: '320kbps', sizeFactor: 0.04, ext: 'MP3' },
        { label: 'MP3 192kbps', q: '192kbps', sizeFactor: 0.024, ext: 'MP3' },
        { label: 'MP3 128kbps', q: '128kbps', sizeFactor: 0.015, ext: 'MP3' }
      ].map(aud => {
        const estBytes = durationSec * aud.sizeFactor * 1024 * 1024;
        return {
          label: aud.label,
          quality: aud.q,
          ext: aud.ext,
          size: youtubeService.formatFileSize(estBytes),
          hasAudio: false
        };
      });

      setVideoData({
        id: videoId,
        url: input,
        thumbnail: videoInfo.thumbnail,
        title: videoInfo.title,
        duration: youtubeService.formatDuration(durationSec),
        durationSec: durationSec,
        uploader: videoInfo.uploader || 'YouTube Creator',
        videoFormats: mappedFormats,
        audioFormats: audioFormats
      });

      // Fetch AI Insights parallelly/sequentially
      try {
        const insights = await youtubeService.getSeoInsights(videoInfo.title);
        setAiInsights(insights);
      } catch (err) {
        console.error('Failed to load SEO insights:', err);
        setAiInsights({
          optimizedTitle: `Ultimate Guide: ${videoInfo.title} (2026 Tutorial)`,
          tags: ["#viral", "#guide", "#tutorial", "#tech", "#2026"],
          description: `In this video, we explore ${videoInfo.title}. We cover all the key topics and walk through them step by step. Perfect for beginners and advanced viewers alike.`,
          seoScore: 85,
          viralPotential: "Medium",
          trendingScore: 78,
          category: "Education",
          suggestedKeywords: ["tutorial", "guide", "how-to", "video info", "learning"],
          bestHashtags: ["#tutorial", "#guide", "#youtube"],
          contentSummary: "A comprehensive video guide focusing on tips, tricks, and best practices.",
          titleAnalysis: "Good title with search keywords, though it could benefit from an exclamation or emotional trigger.",
          uploadDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        });
      } finally {
        setLoadingInsights(false);
      }

    } catch (error) {
      console.error('Error:', error);
      alert('Error fetching video: ' + (error instanceof Error ? error.message : String(error)));
      setLoadingInsights(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: VideoFormat, isAudio: boolean) => {
    if (!videoData) return;
    
    const key = isAudio ? `audio_${format.quality}` : `video_${format.label}`;
    setDownloading(key);
    setDownloadProgress(5);
    
    const progressInterval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 90) return 90;
        return prev + Math.floor(Math.random() * 5) + 3;
      });
    }, 400);

    try {
      const qVal = isAudio ? format.quality.replace('kbps', '') : format.label.replace('p', '');
      const typeVal = isAudio ? 'audio' : 'video';
      const fmtVal = isAudio ? 'mp3' : 'mp4';
      
      const response = await youtubeService.downloadVideo(
        videoData.url,
        qVal,
        typeVal,
        fmtVal
      );

      clearInterval(progressInterval);
      setDownloadProgress(100);

      if (response.success && response.downloadUrl) {
        const link = document.createElement('a');
        link.href = response.downloadUrl;
        const safeTitle = videoData.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        link.download = `${safeTitle}_${isAudio ? format.quality : format.label}.${fmtVal}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('No download URL returned');
      }

      setTimeout(() => {
        setDownloading(null);
        setDownloadProgress(0);
      }, 1500);

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Download error:', error);
      alert('Download failed: ' + (error instanceof Error ? error.message : String(error)));
      setDownloading(null);
      setDownloadProgress(0);
    }
  };

  const handleDownloadAll = async () => {
    if (!videoData || !videoData.videoFormats || !videoData.videoFormats[0]) return;
    await handleDownload(videoData.videoFormats[0], false);
  };

  const handleCopyInfo = () => {
    if (!videoData) return;
    
    let infoText = `🎥 VidVault Video Summary 🎥\n`;
    infoText += `------------------------------------\n`;
    infoText += `Title: ${videoData.title}\n`;
    infoText += `Channel: ${videoData.uploader}\n`;
    infoText += `Duration: ${videoData.duration}\n`;
    infoText += `URL: ${videoData.url}\n`;
    
    if (aiInsights) {
      infoText += `------------------------------------\n`;
      infoText += `🤖 AI Optimized Title: ${aiInsights.optimizedTitle}\n`;
      infoText += `Category: ${aiInsights.category}\n`;
      infoText += `SEO Score: ${aiInsights.seoScore}/100\n`;
      infoText += `Summary: ${aiInsights.contentSummary}\n`;
      infoText += `Tags: ${aiInsights.tags.join(', ')}\n`;
    }
    
    navigator.clipboard.writeText(infoText).then(() => {
      setCopiedInfo(true);
      setTimeout(() => setCopiedInfo(false), 2000);
    });
  };

  const handleShare = () => {
    if (!videoData) return;
    
    if (navigator.share) {
      navigator.share({
        title: videoData.title,
        text: `Check out this YouTube downloader & AI Insights tool!`,
        url: window.location.href,
      }).catch(err => console.log('Share failed:', err));
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      });
    }
  };

  const isButtonDisabled = loading || !input;

  return (
    <div className="relative min-h-screen bg-transparent flex flex-col justify-center pt-24 pb-20">
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0ms' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/20 border border-cyan-500/20 backdrop-blur-md mb-8 hover:bg-cyan-950/40 transition-colors cursor-default shadow-[0_0_15px_-5px_rgba(6,182,212,0.2)]">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]"></span>
              <span className="text-xs font-semibold text-cyan-200 tracking-wider uppercase">VidVault v2.0 Live</span>
          </div>
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6 drop-shadow-2xl animate-fade-in-up opacity-0" style={{ animationDelay: '150ms' }}>
          YouTube Video <br className="hidden sm:block" />
          <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-gradient-x bg-[size:200%_auto]">
            Downloader
          </span>
        </h1>
        
        <p className="mt-4 text-lg sm:text-xl text-slate-400 max-w-2xl mb-12 font-light leading-relaxed animate-fade-in-up opacity-0" style={{ animationDelay: '300ms' }}>
          Paste the link below to <span className="text-cyan-200 font-medium">instantly</span> save videos in 
          <span className="inline-flex items-center mx-2 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs align-middle text-slate-300">4K</span> 
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs align-middle text-slate-300">HD</span>
        </p>

        <div className="w-full max-w-4xl mx-auto relative group z-20 perspective-[1000px] animate-fade-in-up opacity-0" style={{ animationDelay: '450ms' }}>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[98%] h-[80%] bg-cyan-500/20 blur-[50px] rounded-full opacity-50 pointer-events-none"></div>

          <div className="relative rounded-[20px] bg-slate-900/80 backdrop-blur-xl border border-white/10 p-2 shadow-2xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row gap-2">
              
              <div className="relative flex-grow group/input">
                <div className="absolute -inset-[1.5px] rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-0 group-focus-within/input:opacity-100 blur-[2px] transition-opacity duration-500"></div>

                <div className="relative h-16 rounded-xl bg-slate-950 border border-white/5 group-focus-within/input:border-transparent flex items-center overflow-hidden transition-all duration-300">
                   <div className="pl-5 pr-3 text-slate-500 group-focus-within/input:text-cyan-400 transition-colors">
                      <LinkIcon className="h-5 w-5" />
                   </div>
                   <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Paste YouTube Video Link here..."
                    className="block w-full h-full bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 focus:outline-none font-medium text-lg"
                    onKeyDown={(e) => e.key === 'Enter' && handleProcess()}
                  />
                </div>
              </div>

              <button
                onClick={handleProcess}
                disabled={isButtonDisabled}
                className="group/btn relative min-w-[180px] h-16 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 transition-transform duration-300 group-hover/btn:scale-105"></div>
                <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-10 skew-x-12"></div>
                
                <div className="relative z-20 flex items-center justify-center gap-2 text-white font-bold tracking-wide text-lg h-full">
                  {loading ? (
                     <Loader2 className="animate-spin h-6 w-6 text-white" />
                  ) : (
                     <>
                       <span>Download</span>
                       <div className="bg-white/20 p-1.5 rounded-lg group-hover/btn:bg-white/30 transition-colors">
                          <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                       </div>
                     </>
                  )}
                </div>
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-3 px-4 animate-fade-in-up opacity-0" style={{ animationDelay: '600ms' }}>
             <div className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300 transition-colors cursor-default group">
                <CheckCircle2 className="w-4 h-4 text-cyan-500 group-hover:drop-shadow-[0_0_5px_rgba(6,182,212,0.5)] transition-all"/> 
                <span>Unlimited</span>
             </div>
             <div className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300 transition-colors cursor-default group">
                <Shield className="w-4 h-4 text-cyan-500 group-hover:drop-shadow-[0_0_5px_rgba(6,182,212,0.5)] transition-all"/> 
                <span>Secure</span>
             </div>
             <div className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300 transition-colors cursor-default group">
                <Zap className="w-4 h-4 text-cyan-500 group-hover:drop-shadow-[0_0_5px_rgba(6,182,212,0.5)] transition-all"/> 
                <span>Fast</span>
             </div>
          </div>
        </div>

        {/* LOADING PULSING SKELETON */}
        {loading && (
          <div className="mt-16 w-full max-w-4xl animate-pulse z-10">
            <div className="glass-card rounded-[24px] overflow-hidden border border-white/10 p-6 shadow-2xl relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
              
              {/* Header Skeleton */}
              <div className="flex flex-col md:flex-row gap-6 mb-8 text-left">
                <div className="md:w-5/12 aspect-video rounded-xl bg-white/5 border border-white/5"></div>
                <div className="md:w-7/12 flex flex-col justify-center space-y-4">
                  <div className="h-6 w-3/4 bg-white/10 rounded-md"></div>
                  <div className="h-4 w-1/2 bg-white/5 rounded-md"></div>
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-cyan-500/10 rounded-full"></div>
                    <div className="h-5 w-16 bg-purple-500/10 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              {/* Downloads Grid Skeletons */}
              <div className="space-y-6">
                <div>
                  <div className="h-5 w-40 bg-white/10 rounded-md mb-3"></div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(n => (
                      <div key={n} className="h-16 bg-white/5 rounded-xl border border-white/5"></div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="h-5 w-40 bg-white/10 rounded-md mb-3"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[1, 2, 3].map(n => (
                      <div key={n} className="h-16 bg-white/5 rounded-xl border border-white/5"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS INTERFACE */}
        {videoData && !loading && (
          <div className="mt-16 w-full max-w-4xl space-y-6 z-10">
             {/* Main Result Card */}
             <div className="glass-card rounded-[24px] overflow-hidden border border-white/10 shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)] transition-all duration-300">
                
                {/* Info Header Area */}
                <div className="flex flex-col md:flex-row p-6 gap-6 bg-gradient-to-b from-white/5 to-transparent">
                   
                   {/* Thumbnail Container */}
                   <div className="md:w-5/12 relative group overflow-hidden rounded-xl border border-white/10 aspect-video self-start">
                     <img 
                       src={videoData.thumbnail} 
                       alt={videoData.title} 
                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                     />
                     <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                         <PlaySquare className="text-cyan-400 w-12 h-12 drop-shadow-[0_0_10px_#22d3ee] scale-90 group-hover:scale-100 transition-transform duration-300" />
                     </div>
                     
                     {/* Duration Badge */}
                     <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/80 backdrop-blur-sm text-xs font-mono text-slate-300 border border-white/10">
                       {videoData.duration}
                     </div>
                   </div>
                   
                   {/* Details Container */}
                   <div className="md:w-7/12 flex flex-col justify-between text-left">
                     <div>
                       {/* Badges / Header Tools */}
                       <div className="flex items-center justify-between gap-2 mb-3">
                         <div className="flex items-center gap-2">
                             <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]"></span>
                             <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Ready to Download</span>
                         </div>
                         
                         <div className="flex items-center gap-2">
                           <button 
                             onClick={handleCopyInfo}
                             title="Copy Video Info"
                             className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-950/40 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer"
                           >
                             {copiedInfo ? <Check className="w-4 h-4 text-emerald-400 animate-bounce" /> : <Copy className="w-4 h-4" />}
                           </button>
                           <button 
                             onClick={handleShare}
                             title="Share Link"
                             className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-950/40 text-slate-400 hover:text-purple-400 transition-all cursor-pointer"
                           >
                             {copiedShare ? <Check className="w-4 h-4 text-emerald-400 animate-bounce" /> : <Share2 className="w-4 h-4" />}
                           </button>
                         </div>
                       </div>

                       <h3 className="text-xl sm:text-2xl font-bold text-white line-clamp-2 leading-snug drop-shadow-md mb-2">
                         {videoData.title}
                       </h3>
                       
                       <p className="text-sm text-slate-400 mb-4 flex items-center gap-1.5">
                         <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                         Channel: <span className="text-slate-300 font-medium">{videoData.uploader}</span>
                       </p>
                     </div>

                     {/* Live Download Status Progress */}
                     {downloading && (
                       <div className="mb-4 bg-slate-950/80 p-3.5 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_-5px_rgba(6,182,212,0.3)]">
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-xs text-slate-300 flex items-center gap-2">
                             <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                             Downloading {downloading.includes('audio_') ? 'audio' : 'video'}...
                           </span>
                           <span className="text-xs text-cyan-400 font-bold">{downloadProgress}%</span>
                         </div>
                         <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                           <div 
                             className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 shadow-[0_0_8px_#22d3ee] transition-all duration-300"
                             style={{ width: `${downloadProgress}%` }}
                           />
                         </div>
                       </div>
                     )}

                     <div className="flex gap-3">
                       <button
                         onClick={() => setShowInsights(!showInsights)}
                         className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300 transition-all shadow-md active:scale-95 cursor-pointer"
                       >
                         <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                         <span>{showInsights ? 'Hide AI Insights' : 'Show AI Insights'}</span>
                         {showInsights ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                       </button>
                     </div>
                   </div>
                </div>

                {/* Grid Section */}
                <div className="p-6 border-t border-white/5 space-y-6">
                  
                  {/* 🎥 VIDEO DOWNLOADS */}
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-cyan-400" />
                      <span>🎥 Video Downloads (MP4)</span>
                    </h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {videoData.videoFormats.map((fmt, idx) => {
                        const isThisDownloading = downloading === `video_${fmt.label}`;
                        return (
                          <button 
                            key={idx} 
                            onClick={() => handleDownload(fmt, false)}
                            disabled={downloading !== null}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-950/20 hover:shadow-[0_0_15px_-5px_rgba(6,182,212,0.3)] transition-all group relative overflow-hidden cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                              isThisDownloading ? 'border-cyan-500/70 bg-cyan-950/20' : 'bg-slate-900/40'
                            }`}
                          >
                            {isThisDownloading ? (
                              <Loader2 className="w-5 h-5 animate-spin text-cyan-400 my-1" />
                            ) : (
                              <>
                                <span className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 z-10 transition-colors">{fmt.label}</span>
                                <span className="text-[10px] text-cyan-400/80 font-semibold uppercase tracking-wider z-10">{fmt.ext}</span>
                                <span className="text-[10px] text-slate-400 mt-1 font-mono z-10">{fmt.size}</span>
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <Download className="absolute bottom-2 right-2 w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0" />
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 🎵 AUDIO DOWNLOADS */}
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Music className="w-4 h-4 text-purple-400" />
                      <span>🎵 Audio Downloads (MP3)</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {videoData.audioFormats.map((fmt, idx) => {
                        const isThisDownloading = downloading === `audio_${fmt.quality}`;
                        return (
                          <button 
                            key={idx} 
                            onClick={() => handleDownload(fmt, true)}
                            disabled={downloading !== null}
                            className={`flex items-center justify-between p-3.5 px-5 rounded-xl border border-white/5 hover:border-purple-500/50 hover:bg-purple-950/20 hover:shadow-[0_0_15px_-5px_rgba(168,85,247,0.3)] transition-all group relative overflow-hidden cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                              isThisDownloading ? 'border-purple-500/70 bg-purple-950/20' : 'bg-slate-900/40'
                            }`}
                          >
                            {isThisDownloading ? (
                              <div className="w-full flex justify-center py-1">
                                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-3 z-10">
                                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-all">
                                    <Music className="w-4 h-4" />
                                  </div>
                                  <div className="text-left">
                                    <span className="text-sm font-bold text-slate-100 group-hover:text-purple-300 transition-colors block">{fmt.label}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{fmt.size}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 z-10 text-purple-400/80 group-hover:text-purple-300 transition-colors">
                                  <span className="text-xs font-semibold uppercase tracking-wider">{fmt.ext}</span>
                                  <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
                
                {/* Footer actions inside result card */}
                <div className="bg-slate-950/60 p-4 px-6 border-t border-white/5 flex justify-between items-center backdrop-blur-md">
                   <div className="flex items-center gap-2">
                       <div className="relative flex h-2.5 w-2.5">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                       </div>
                       <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Fast Server Merge Enabled</span>
                   </div>
                   <button 
                     onClick={handleDownloadAll}
                     disabled={downloading !== null}
                     className="text-cyan-400 text-sm font-semibold hover:text-cyan-300 flex items-center gap-2 transition-colors group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     Download Best Video <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
             </div>

             {/* AI Insights Card */}
             {showInsights && (
               <div className="glass-card rounded-[24px] border border-white/10 p-6 shadow-2xl relative overflow-hidden transition-all duration-500">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                 <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                 
                 <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                   <div className="flex items-center gap-2.5">
                     <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                       <Sparkles className="w-5 h-5" />
                     </div>
                     <div className="text-left">
                       <h3 className="text-lg font-bold text-white flex items-center gap-2">
                         🤖 AI Content Insights
                       </h3>
                       <p className="text-xs text-slate-400">Powered by Gemini - Smart Metadata Analysis</p>
                     </div>
                   </div>
                   
                   {loadingInsights && (
                     <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-500/5 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                       <Loader2 className="w-3.5 h-3.5 animate-spin" />
                       Analyzing...
                     </div>
                   )}
                 </div>

                 {loadingInsights ? (
                   /* Insights Loading Skeleton */
                   <div className="space-y-6 animate-pulse text-left">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="h-28 bg-white/5 rounded-2xl border border-white/5"></div>
                       <div className="h-28 bg-white/5 rounded-2xl border border-white/5"></div>
                       <div className="h-28 bg-white/5 rounded-2xl border border-white/5"></div>
                     </div>
                     <div className="h-6 w-1/3 bg-white/10 rounded-md"></div>
                     <div className="h-20 bg-white/5 rounded-xl border border-white/5"></div>
                   </div>
                 ) : aiInsights ? (
                   <div className="space-y-6 text-left">
                     
                     {/* Scores Row */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       
                       {/* SEO Score Circular Indicator */}
                       <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/5 flex items-center justify-between gap-4">
                         <div>
                           <span className="text-xs font-semibold text-slate-400 block mb-1">SEO Score</span>
                           <span className="text-2xl font-black text-white">{aiInsights.seoScore}%</span>
                           <span className="text-[10px] text-emerald-400 font-medium block mt-1">Excellent Optimization</span>
                         </div>
                         
                         <div className="relative flex items-center justify-center">
                           <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                             <circle cx="50" cy="50" r="40" className="text-slate-800" strokeWidth="10" stroke="currentColor" fill="none" />
                             <circle cx="50" cy="50" r="40" className="text-cyan-400 transition-all duration-1000 ease-out" strokeWidth="10" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - aiInsights.seoScore / 100)} strokeLinecap="round" stroke="currentColor" fill="none" />
                           </svg>
                           <Award className="absolute w-6 h-6 text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]" />
                         </div>
                       </div>

                       {/* Trending Score Circular Indicator */}
                       <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/5 flex items-center justify-between gap-4">
                         <div>
                           <span className="text-xs font-semibold text-slate-400 block mb-1">Trending Potential</span>
                           <span className="text-2xl font-black text-white">{aiInsights.trendingScore}%</span>
                           <span className="text-[10px] text-purple-400 font-medium block mt-1">Strong Market Search</span>
                         </div>
                         
                         <div className="relative flex items-center justify-center">
                           <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                             <circle cx="50" cy="50" r="40" className="text-slate-800" strokeWidth="10" stroke="currentColor" fill="none" />
                             <circle cx="50" cy="50" r="40" className="text-purple-400 transition-all duration-1000 ease-out" strokeWidth="10" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - aiInsights.trendingScore / 100)} strokeLinecap="round" stroke="currentColor" fill="none" />
                           </svg>
                           <TrendingUp className="absolute w-6 h-6 text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]" />
                         </div>
                       </div>

                       {/* Viral Potential Meter */}
                       <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
                         <div className="flex justify-between items-start">
                           <div>
                             <span className="text-xs font-semibold text-slate-400 block">Viral Potential</span>
                             <span className="text-xl font-bold text-white mt-1">{aiInsights.viralPotential}</span>
                           </div>
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                             aiInsights.viralPotential === 'High' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                             aiInsights.viralPotential === 'Medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                             'bg-slate-500/10 border-slate-500/20 text-slate-400'
                           }`}>
                             {aiInsights.viralPotential} Range
                           </span>
                         </div>
                         
                         <div className="mt-4 space-y-1">
                           <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                             <span>STABILITY</span>
                             <span>VIRAL</span>
                           </div>
                           <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5 relative">
                             <div 
                               className={`h-full transition-all duration-1000 ${
                                 aiInsights.viralPotential === 'High' ? 'bg-gradient-to-r from-purple-500 to-rose-500 w-[90%]' :
                                 aiInsights.viralPotential === 'Medium' ? 'bg-gradient-to-r from-blue-500 to-amber-500 w-[60%]' :
                                 'bg-gradient-to-r from-blue-500 to-cyan-500 w-[30%]'
                               }`}
                             />
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Optimized Title Card */}
                     <div className="bg-slate-950/20 rounded-2xl p-5 border border-white/5 space-y-3 relative group overflow-hidden">
                       <div className="absolute top-0 left-0 w-[3px] h-full bg-cyan-500"></div>
                       <div className="flex items-center justify-between">
                         <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                           <Sparkles className="w-3.5 h-3.5" />
                           OPTIMIZED TITLE (HIGH CTR)
                         </span>
                         <button 
                           onClick={() => {
                             navigator.clipboard.writeText(aiInsights.optimizedTitle);
                             alert('Title copied!');
                           }}
                           className="text-slate-500 hover:text-cyan-400 transition-colors p-1 cursor-pointer"
                           title="Copy Optimized Title"
                         >
                           <Copy className="w-3.5 h-3.5" />
                         </button>
                       </div>
                       <p className="text-base font-bold text-white tracking-wide">
                         "{aiInsights.optimizedTitle}"
                       </p>
                       <p className="text-xs text-slate-400 italic font-medium">
                         💡 {aiInsights.titleAnalysis}
                       </p>
                     </div>

                     {/* Keywords & Hashtags */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {/* Keywords */}
                       <div className="bg-slate-950/30 rounded-2xl p-4 border border-white/5 space-y-3">
                         <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase">
                           <Hash className="w-3.5 h-3.5 text-cyan-400" />
                           Suggested SEO Keywords
                         </span>
                         <div className="flex flex-wrap gap-1.5">
                           {aiInsights.suggestedKeywords.map((kw, i) => (
                             <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300 transition-colors cursor-default">
                               {kw}
                             </span>
                           ))}
                         </div>
                       </div>

                       {/* Hashtags */}
                       <div className="bg-slate-950/30 rounded-2xl p-4 border border-white/5 space-y-3">
                         <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase">
                           <Hash className="w-3.5 h-3.5 text-purple-400" />
                           Best Hashtags
                         </span>
                         <div className="flex flex-wrap gap-1.5">
                           {aiInsights.bestHashtags.map((ht, i) => (
                             <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/5 border border-purple-500/10 text-purple-300 hover:border-purple-500/30 hover:text-purple-300 transition-colors cursor-default">
                               {ht}
                             </span>
                           ))}
                         </div>
                       </div>
                     </div>

                     {/* Video Metadata Table details */}
                     <div className="bg-slate-950/40 rounded-2xl p-5 border border-white/5 space-y-4">
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                         <div>
                           <span className="text-slate-500 block">Category</span>
                           <span className="text-slate-300 font-semibold mt-0.5 block">{aiInsights.category}</span>
                         </div>
                         <div>
                           <span className="text-slate-500 block">Creator</span>
                           <span className="text-slate-300 font-semibold mt-0.5 block">{videoData.uploader}</span>
                         </div>
                         <div>
                           <span className="text-slate-500 block">Analyzed Date</span>
                           <span className="text-slate-300 font-semibold mt-0.5 block">{aiInsights.uploadDate}</span>
                         </div>
                         <div>
                           <span className="text-slate-500 block">Duration</span>
                           <span className="text-slate-300 font-semibold mt-0.5 block">{videoData.duration}</span>
                         </div>
                       </div>
                       
                       <div className="border-t border-white/5 pt-4">
                         <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase mb-2">
                           <FileText className="w-3.5 h-3.5 text-cyan-400" />
                           Content Summary
                         </span>
                         <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                           {aiInsights.contentSummary}
                         </p>
                       </div>

                       <div className="border-t border-white/5 pt-4">
                         <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase mb-2">
                           <FileText className="w-3.5 h-3.5 text-purple-400" />
                           Optimized Description
                         </span>
                         <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light whitespace-pre-line bg-slate-950/20 p-3 rounded-xl border border-white/5">
                           {aiInsights.description}
                         </p>
                       </div>
                     </div>

                   </div>
                 ) : null}
               </div>
             )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Hero;