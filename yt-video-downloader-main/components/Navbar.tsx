import React, { useState } from 'react';
import { Menu, X, PlaySquare } from 'lucide-react';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed w-full z-50 transition-all duration-300 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <PlaySquare className="relative h-8 w-8 text-cyan-400" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white group-hover:text-cyan-50 transition-colors">VidVault</span>
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-8">
            <a href="#" className="text-cyan-400 px-3 py-2 text-sm font-medium border-b-2 border-cyan-500/50">
              Downloader
            </a>
            <a href="#features" className="text-slate-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-slate-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors">
              How It Works
            </a>
            <a href="#faq" className="text-slate-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors">
              FAQ
            </a>
          </div>

          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="sm:hidden bg-slate-900 border-b border-slate-800">
          <div className="pt-2 pb-3 space-y-1">
            <a href="#" className="bg-slate-800 text-white block pl-3 pr-4 py-2 border-l-4 border-cyan-500 text-base font-medium">
              Downloader
            </a>
            <a href="#features" className="border-transparent text-slate-400 hover:bg-slate-800 hover:text-white block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
              Features
            </a>
            <a href="#how-it-works" className="border-transparent text-slate-400 hover:bg-slate-800 hover:text-white block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
              How It Works
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;