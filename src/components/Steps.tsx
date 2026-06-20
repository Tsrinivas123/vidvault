import React from 'react';
import { ProcessStep } from '../types';

const steps: ProcessStep[] = [
  {
    number: '01',
    title: 'Copy Link',
    description: 'Go to the YouTube app or browser and copy the link (URL) of your favorite video.',
  },
  {
    number: '02',
    title: 'Paste Link',
    description: 'Come back to the website and paste the video link in the input box above.',
  },
  {
    number: '03',
    title: 'Download',
    description: 'Select your preferred format and quality, then click the download button. That\'s it!',
  },
];

const Steps: React.FC = () => {
  return (
    <div id="how-it-works" className="relative bg-transparent py-24 sm:py-32 border-t border-white/5 border-b">
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How It Works?
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Download videos in just 3 simple steps.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="relative group p-8 rounded-2xl glass-card hover:border-cyan-500/50">
              <div className="text-6xl font-black text-white/5 absolute top-4 right-6 select-none group-hover:text-white/10 transition-colors">
                {step.number}
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/20">
                  <span className="text-white font-bold text-xl">{step.number}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Steps;