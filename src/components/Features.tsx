import React from 'react';
import { Zap, Shield, Smartphone, Sliders, DollarSign, Ban, Users, ArrowRight } from 'lucide-react';
import { FeatureItem } from '../types';

const features: FeatureItem[] = [
  {
    title: 'Super Fast Speed',
    description: 'Our system is lightning fast. Video downloads start instantly without any waiting time.',
    icon: Zap,
  },
  {
    title: '100% Safe & Secure',
    description: 'Your privacy is our priority. We do not store any personal user data on our servers.',
    icon: Shield,
  },
  {
    title: 'No Pop-up Ads',
    description: 'Clean experience. No need to worry about annoying ads. A completely smooth interface.',
    icon: Ban,
  },
  {
    title: 'All Devices Support',
    description: 'Mobile, Tablet, Laptop - this downloader works perfectly on all browsers and devices.',
    icon: Smartphone,
  },
  {
    title: 'High Quality Options',
    description: 'Select your preferred quality: 1080p, 720p, 4K, or just high-quality Audio (MP3).',
    icon: Sliders,
  },
  {
    title: 'Lifetime Free',
    description: 'Download unlimited videos completely for free. No hidden charges or subscriptions.',
    icon: DollarSign,
  },
];

const Features: React.FC = () => {
  return (
    <div id="features" className="relative bg-transparent py-24 sm:py-32 overflow-hidden border-t border-white/5">
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-500/20 mb-8 backdrop-blur-md">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-100 tracking-wide uppercase">Used by 100,000+ Users</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-6 drop-shadow-xl">
            Fastest <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Video Downloader</span>
          </h2>
          
          <p className="text-lg text-slate-400 leading-relaxed max-w-xl mx-auto">
            Download directly from your browser without installing software. A trustworthy and reliable tool.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, idx) => (
              <div 
                key={feature.title} 
                className="group relative rounded-2xl glass-card p-8 hover:-translate-y-1 hover:border-cyan-500/50"
              >
                {/* Hover Gradient Shine */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 group-hover:border-cyan-500/50 group-hover:scale-110 transition-all duration-300 shadow-lg group-hover:shadow-cyan-500/20">
                    <feature.icon className="h-7 w-7 text-cyan-400 group-hover:text-cyan-300 drop-shadow-lg" aria-hidden="true" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-50 transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-slate-400 leading-relaxed text-sm mb-6 group-hover:text-slate-300 transition-colors">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Features;