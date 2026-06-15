import React, { useState, useMemo } from 'react';
import { Loader2, Link as LinkIcon, CheckCircle2, Video, Music, PlaySquare, Zap, Shield, ArrowRight } from 'lucide-react';
import { youtubeService } from '../src/services/youtubeService';

interface VideoFormat {
  label: string;
  ext: string;
  size: string;
  quality: string;
  hasAudio: boolean;
}

interface VideoData {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  duration: string;
  formats: VideoFormat[];
}

const Hero: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const stars = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    delay: `${Math.random() * 3}s`,
    duration: `${Math.random() * 3 + 2}s`,
    opacity: Math.random() * 0.5 + 0.3
  })), []);

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProcess = async () => {
    const videoId = extractVideoId(input);
    if (!videoId) {
      return;
    }
    
    setLoading(true);
    setVideoData(null);
    
    try {
      const videoInfo = await youtubeService.getVideoInfo(input);
      
      const formats: VideoFormat[] = videoInfo.formats.map(f => ({
        label: f.quality,
        ext: f.ext,
        size: typeof f.filesize === 'number' 
          ? `${(f.filesize / (1024 * 1024)).toFixed(1)} MB` 
          : 'Unknown',
        quality: f.quality.includes('1080') ? 'High' : 
                 f.quality.includes('720') ? 'Medium' : 'Low',
        hasAudio: true
      }));

      formats.push({
        label: "Audio",
        ext: "mp3",
        size: "~12 MB",
        quality: "320kbps",
        hasAudio: true
      });

      setVideoData({
        id: videoId,
        url: input,
        thumbnail: videoInfo.thumbnail,
        title: videoInfo.title,
        duration: formatDuration(videoInfo.duration),
        formats: formats
      });

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: VideoFormat) => {
    if (!videoData) return;
    
    try {
      setDownloading(format.label);
      setDownloadProgress(25);
      
      const quality = format.label.replace('p', '');

      const { directUrl } = await youtubeService.getDownloadLink(
        videoData.url,
        format.label === 'Audio' ? undefined : quality
      );

      if (directUrl) {
        setDownloadProgress(50);
        
        // New tab mein kholo - browser download karega
        window.open(directUrl, '_blank');
        
        setDownloadProgress(100);
        
        setTimeout(() => {
          setDownloading(null);
          setDownloadProgress(0);
        }, 1500);
      }

    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed: ' + error);
      setDownloading(null);
      setDownloadProgress(0);
    }
  };

  const handleDownloadAll = async () => {
    if (!videoData || !videoData.formats[0]) return;
    await handleDownload(videoData.formats[0]);
  };

  const isButtonDisabled = loading || !input;

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-hidden flex flex-col justify-center pt-24 pb-20">
      
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[#020617] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#050b1d] to-[#020617]"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[120px] animate-blob mix-blend-screen"></div>
        <div className="absolute top-[30%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-screen"></div>
        
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute bg-white rounded-full animate-twinkle"
            style={{
              left: star.left,
              top: star.top,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDelay: star.delay,
              animationDuration: star.duration
            }}
          />
        ))}

        <div className="absolute top-[15%] left-[10%] text-cyan-500/10 animate-float hidden lg:block" style={{ animationDelay: '0s' }}>
          <Video className="w-16 h-16 transform rotate-[-12deg]" />
        </div>
        <div className="absolute bottom-[20%] left-[5%] text-indigo-500/10 animate-float hidden lg:block" style={{ animationDelay: '2s' }}>
          <Music className="w-12 h-12 transform rotate-[12deg]" />
        </div>
        <div className="absolute top-[25%] right-[10%] text-purple-500/10 animate-float hidden lg:block" style={{ animationDelay: '1s' }}>
          <PlaySquare className="w-20 h-20 transform rotate-[6deg]" />
        </div>
        <div className="absolute bottom-[25%] right-[15%] text-blue-500/10 animate-float hidden lg:block" style={{ animationDelay: '3s' }}>
          <Zap className="w-10 h-10 transform rotate-[-6deg]" />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] opacity-40"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0ms' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/20 border border-cyan-500/20 backdrop-blur-md mb-8 hover:bg-cyan-950/40 transition-colors cursor-default shadow-[0_0_15px_-5px_rgba(6,182,212,0.2)]">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]"></span>
              <span className="text-xs font-semibold text-cyan-200 tracking-wider uppercase">VidVault v2.0 Live</span>
          </div>
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6 drop-shadow-2xl animate-fade-in-up opacity-0" style={{ animationDelay: '150ms' }}>
          YouTube Video <br className="hidden sm:block" />
          <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-gradient-x">
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

        {videoData && (
          <div className="mt-16 w-full max-w-4xl animate-fade-in-up">
             <div className="glass-card rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-black/50">
                <div className="flex flex-col md:flex-row">
                   <div className="md:w-5/12 relative group overflow-hidden">
                     <img 
                       src={videoData.thumbnail} 
                       alt="Video thumbnail" 
                       className="w-full h-full object-cover aspect-video group-hover:scale-105 transition-transform duration-700"
                     />
                     <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                         <PlaySquare className="text-white w-12 h-12 drop-shadow-lg scale-90 group-hover:scale-100 transition-transform duration-300" />
                     </div>
                   </div>
                   
                   <div className="p-6 md:w-7/12 text-left bg-gradient-to-b from-slate-900/50 to-transparent">
                     <div className="flex items-start justify-between gap-4 mb-2">
                       <h3 className="text-xl font-bold text-white line-clamp-2 leading-tight group-hover:text-cyan-400 transition-colors">{videoData.title}</h3>
                       <div className="flex-shrink-0">
                         <span className="px-2 py-1 rounded bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700">{videoData.duration}</span>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-3 mb-6">
                       <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/10 text-xs font-medium text-cyan-400 border border-cyan-500/20">
                          <Video className="w-3 h-3"/> MP4
                       </span>
                       <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-500/10 text-xs font-medium text-purple-400 border border-purple-500/20">
                          <Music className="w-3 h-3"/> MP3
                       </span>
                     </div>

                     {downloading && (
                       <div className="mb-4 bg-slate-800/50 p-3 rounded-lg border border-cyan-500/30">
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-xs text-slate-300">Downloading {downloading}...</span>
                           <span className="text-xs text-cyan-400 font-bold">{downloadProgress}%</span>
                         </div>
                         <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                             style={{ width: `${downloadProgress}%` }}
                           />
                         </div>
                       </div>
                     )}

                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                       {videoData.formats.slice(0, 4).map((fmt, idx) => (
                         <button 
                           key={idx} 
                           onClick={() => handleDownload(fmt)}
                           disabled={downloading !== null}
                           className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/40 border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-900/20 transition-all group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           {downloading === fmt.label ? (
                             <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                           ) : (
                             <>
                               <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 z-10">{fmt.label}</span>
                               <span className="text-[10px] text-slate-500 uppercase z-10 group-hover:text-cyan-400/70">{fmt.ext}</span>
                               <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                             </>
                           )}
                         </button>
                       ))}
                     </div>
                   </div>
                </div>
                
                <div className="bg-slate-900/80 p-4 border-t border-white/5 flex justify-between items-center backdrop-blur-md">
                   <div className="flex items-center gap-2">
                      <div className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Ready to Download</span>
                   </div>
                   <button 
                     onClick={handleDownloadAll}
                     disabled={downloading !== null}
                     className="text-cyan-400 text-sm font-semibold hover:text-cyan-300 flex items-center gap-2 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     Download All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
             </div>
          </div>
        )}

      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default Hero;