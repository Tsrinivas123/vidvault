import React from 'react';
import { PlaySquare } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black border-t border-white/10" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <div className="flex items-center gap-2 group">
              <PlaySquare className="h-8 w-8 text-cyan-500 group-hover:text-cyan-400 transition-colors" />
              <span className="font-bold text-xl tracking-tight text-white">VidVault</span>
            </div>
            <p className="text-sm leading-6 text-slate-400">
              The best tool to download YouTube videos in MP4 & MP3. Fast, free and secure.
            </p>
            <div className="text-xs text-slate-500 mt-4 border-l-2 border-slate-800 pl-3">
              Disclaimer: This tool is for personal use only. Please respect YouTube's Terms of Service and copyright laws. Do not download copyrighted content without permission.
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">Quick Links</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li><a href="#" className="text-sm leading-6 text-slate-400 hover:text-cyan-400 transition-colors">Downloader</a></li>
                  <li><a href="#features" className="text-sm leading-6 text-slate-400 hover:text-cyan-400 transition-colors">Features</a></li>
                  <li><a href="#how-it-works" className="text-sm leading-6 text-slate-400 hover:text-cyan-400 transition-colors">How it works</a></li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">Support</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li><a href="#" className="text-sm leading-6 text-slate-400 hover:text-cyan-400 transition-colors">Contact Us</a></li>
                  <li><a href="#" className="text-sm leading-6 text-slate-400 hover:text-cyan-400 transition-colors">Report Issue</a></li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">Legal</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li><a href="#" className="text-sm leading-6 text-slate-400 hover:text-cyan-400 transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="text-sm leading-6 text-slate-400 hover:text-cyan-400 transition-colors">Terms of Service</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs leading-5 text-slate-500">&copy; 2024 VidVault. All rights reserved.</p>
          <p className="text-xs text-slate-600">Made with ❤️ for Creators</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;