"use client";

import { useState, useEffect } from "react";
import { Terminal, Cpu, ScanLine, Activity } from "lucide-react";

export default function AlphaOverlay() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenAlphaMessage = document.cookie
      .split("; ")
      .find((row) => row.startsWith("seenAlphaMessage="));

    if (!hasSeenAlphaMessage) {
      setTimeout(() => {
        setIsVisible(true);
        document.body.style.overflow = "hidden";
      }, 0);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    document.body.style.overflow = "unset";
    const date = new Date();
    date.setTime(date.getTime() + 30 * 24 * 60 * 60 * 1000);
    document.cookie = `seenAlphaMessage=true; expires=${date.toUTCString()}; path=/`;
  };

  if (!isVisible) return null;

  return (
    <div
      onClick={handleDismiss}
      className="fixed inset-0 z-[9999] bg-slate-950 overflow-y-auto cursor-crosshair font-mono select-none"
    >
      {/* Grid Background */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]">
        <span className="text-[15vw] font-bold uppercase tracking-tighter text-white whitespace-nowrap">
          The Polytechnic
        </span>
      </div>

      {/* Main Content Wrapper - Centers content but allows scrolling */}
      <div className="min-h-full w-full flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="relative z-10 w-full max-w-6xl animate-in fade-in zoom-in-95 duration-700">
          <div className="relative border border-slate-800 bg-slate-900/80 backdrop-blur-xl text-slate-300 p-6 md:p-12 shadow-2xl">
            
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500" />

            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 md:mb-12 border-b border-slate-800 pb-6">
              <div className="flex items-center gap-3 text-cyan-500">
                <Terminal className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs uppercase tracking-[0.2em]">Alpha Release Phase</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest">
                 <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                 System Active
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
              
              {/* Main Text */}
              <div className="lg:col-span-7 space-y-6 md:space-y-8">
                <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold uppercase leading-tight tracking-tight text-white">
                  The Next <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                    Polytechnic.
                  </span>
                </h1>
                <div className="h-px w-16 md:w-24 bg-slate-700" />
                <p className="text-sm md:text-lg leading-relaxed text-slate-400 max-w-xl">
                  We are rebuilding our digital identity from the ground up. You
                  are currently viewing an early release of our 2026 infrastructure.
                </p>
              </div>

              {/* Sidebar / Stats */}
              <div className="lg:col-span-5 flex flex-col justify-end space-y-8 md:space-y-10 lg:pl-12 lg:border-l border-slate-800 pt-8 lg:pt-0 border-t lg:border-t-0 border-slate-800/50">
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-cyan-500 text-xs uppercase tracking-widest mb-2">
                    <Activity className="w-4 h-4" /> Official Launch
                  </div>
                  <div className="text-2xl sm:text-3xl md:text-4xl text-white font-light">
                    Late March <br /> 2026
                  </div>
                </div>

                <div className="space-y-4 pt-8 border-t border-slate-800/50">
                  <div className="text-xs text-slate-500 uppercase tracking-widest italic">Sincerely,</div>
                  <div>
                    <div className="text-lg md:text-xl text-white font-bold tracking-wide">Ronan Hevenor</div>
                    <div className="text-[10px] text-cyan-500 uppercase tracking-[0.2em] mt-1 font-bold">Tech Director</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Warning */}
            <div className="mt-12 md:mt-16 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800 pt-6">
               <div className="flex items-center gap-4">
                  <ScanLine className="w-5 h-5 text-slate-600 flex-shrink-0" />
                  <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500 animate-pulse">
                    Click anywhere to enter site
                  </span>
               </div>
               <div className="text-[10px] text-slate-600 font-mono">
                  ID: 2026-ALPHA-V1
               </div>
            </div>

          </div>
        </div>
      </div>

      {/* Floating Status - Adaptive Position */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:left-6 md:right-auto flex items-center gap-3 px-3 py-2 bg-slate-900/90 border border-slate-700 backdrop-blur-md rounded z-50">
        <Cpu className="w-3 h-3 md:w-4 md:h-4 text-cyan-500 animate-spin" />
        <span className="text-[8px] md:text-[10px] text-cyan-400 font-mono tracking-widest uppercase animate-pulse">
          Compiling ...
        </span>
      </div>

    </div>
  );
}