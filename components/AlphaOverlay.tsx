"use client";

import { useState, useEffect } from "react";
import { Terminal, Cpu, ScanLine, Activity, Github } from "lucide-react";

export default function AlphaOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  
  // CONFIGURATION
  const timings = isReturningUser 
    ? {
        // RETURNING USER (9s Total)
        drawPhaseDuration: 2500, 
        glowDuration: 500,       
        fillDuration: 2000,      
        fadeDuration: 1500       
      }
    : {
        // NEW USER (12s Total)
        drawPhaseDuration: 3500, 
        glowDuration: 500,       
        fillDuration: 2500,      
        fadeDuration: 2000       
      };

  // CALCULATED TIMELINE (in ms)
  const startSides = timings.drawPhaseDuration;
  const startGlow = startSides + timings.drawPhaseDuration;
  const startFill = startGlow + timings.glowDuration;
  const startFade = startFill + timings.fillDuration;
  const totalDuration = startFade + timings.fadeDuration;

  // DEFINED BEFORE USEEFFECT TO PREVENT REFERENCE ERROR
  const handleDismiss = () => {
    setIsVisible(false);
    document.body.style.overflow = "unset";
    // Set/Refresh cookie
    const date = new Date();
    date.setTime(date.getTime() + 30 * 24 * 60 * 60 * 1000);
    document.cookie = `seenAlphaMessage=true; expires=${date.toUTCString()}; path=/`;
  };

  useEffect(() => {
    // Check cookie on mount to determine user status
    const checkCookie = setTimeout(() => {
      const hasSeenAlphaMessage = document.cookie
        .split("; ")
        .find((row) => row.startsWith("seenAlphaMessage="));

      if (hasSeenAlphaMessage) {
        setIsReturningUser(true);
      } else {
        setIsReturningUser(false);
      }
      
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    }, 0);

    return () => clearTimeout(checkCookie);
  }, []);

  // Auto-dismiss logic based on dynamic configuration
  useEffect(() => {
    if (!isVisible) return;

    // Add a small buffer (100ms) to ensure CSS animation completes visually
    const autoDismissTimer = setTimeout(() => {
      handleDismiss();
    }, totalDuration + 100); 

    return () => clearTimeout(autoDismissTimer);
  }, [isVisible, totalDuration]);

  if (!isVisible) return null;

  return (
    <div
      onClick={handleDismiss}
      className="fixed inset-0 z-[9999] bg-slate-950 overflow-y-auto cursor-crosshair font-mono select-none animate-site-reveal"
    >
      <style jsx>{`
        /* --- 1. DRAW ANIMATIONS --- */
        @keyframes width-grow {
          0% { width: 0; }
          100% { width: 100%; }
        }
        @keyframes height-grow {
          0% { height: 0; }
          100% { height: 100%; }
        }
        @keyframes appear {
          to { opacity: 1; }
        }

        /* --- 2. GLOW ANIMATION --- */
        @keyframes steady-glow {
          0% { box-shadow: none; filter: brightness(1); }
          100% { box-shadow: 0 0 15px #22d3ee, 0 0 30px #22d3ee; filter: brightness(2); background-color: #a5f3fc; }
        }

        /* --- 3. FILL SCREEN --- */
        @keyframes fill-screen-cyan {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        /* --- 4. EMPTY/REVEAL --- */
        @keyframes fade-out-container {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* --- DYNAMIC CLASS ASSIGNMENTS --- */

        /* Container Fade Out */
        .animate-site-reveal {
          animation: fade-out-container ${timings.fadeDuration}ms ease-out ${startFade}ms forwards;
        }

        /* Full Screen Fill Layer */
        .animate-fill-screen {
          animation: fill-screen-cyan ${timings.fillDuration}ms cubic-bezier(0.4, 0, 0.2, 1) ${startFill}ms forwards;
        }
        
        /* BORDERS */

        /* Top Edge: Phase 1 Draw. Glows after Draw Total. */
        .animate-top {
          animation: 
            width-grow ${timings.drawPhaseDuration}ms linear forwards,
            steady-glow ${timings.glowDuration}ms ease-in-out ${startGlow}ms forwards; 
        }
        
        /* Right Edge: Waits Phase 1. Draws Phase 2. Glows after Draw Total. */
        .animate-right {
          opacity: 0;
          animation: 
            appear 0s linear ${startSides}ms forwards,
            height-grow ${timings.drawPhaseDuration}ms linear ${startSides}ms forwards,
            steady-glow ${timings.glowDuration}ms ease-in-out ${startGlow}ms forwards;
        }
        
        /* Bottom Edge: Phase 1 Draw. Glows after Draw Total. */
        .animate-bottom {
          animation: 
            width-grow ${timings.drawPhaseDuration}ms linear forwards,
            steady-glow ${timings.glowDuration}ms ease-in-out ${startGlow}ms forwards;
        }

        /* Left Edge: Waits Phase 1. Draws Phase 2. Glows after Draw Total. */
        .animate-left {
          opacity: 0;
          animation: 
            appear 0s linear ${startSides}ms forwards,
            height-grow ${timings.drawPhaseDuration}ms linear ${startSides}ms forwards,
            steady-glow ${timings.glowDuration}ms ease-in-out ${startGlow}ms forwards;
        }
      `}</style>

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

      {/* Main Content Wrapper */}
      <div className="min-h-full w-full flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="relative z-10 w-full max-w-6xl animate-in fade-in zoom-in-95 duration-700">
          
          {/* Main Card Container */}
          <div className="relative bg-slate-900/80 backdrop-blur-xl text-slate-300 p-6 md:p-12 shadow-2xl">
            
            {/* Border Animations */}
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="absolute top-0 left-0 h-[2px] bg-cyan-500 animate-top" />
              <div className="absolute top-0 right-0 w-[2px] bg-cyan-500 animate-right" />
              <div className="absolute bottom-0 right-0 h-[2px] bg-cyan-500 animate-bottom" />
              <div className="absolute bottom-0 left-0 w-[2px] bg-cyan-500 animate-left" />
            </div>
            
            {/* Background Border (Static dark border behind) */}
            <div className="absolute inset-0 border border-slate-800 pointer-events-none" />

            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 md:mb-12 border-b border-slate-800 pb-6 relative z-10">
              <div className="flex items-center gap-3 text-cyan-500">
                <Terminal className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs uppercase tracking-[0.2em]">Alpha Release</span>
              </div>
              
              <a 
                href="https://github.com/thepoly/polymer"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()} 
                className="flex items-center gap-3 text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer group"
                aria-label="View Source on GitHub"
              >
                 <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse group-hover:shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-shadow" />
                 <Github className="w-5 h-5" />
              </a>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 relative z-10">
              
              {/* Main Text */}
              <div className="lg:col-span-7 space-y-3 md:space-y-8">
                {isReturningUser ? (
                  <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold uppercase leading-tight tracking-tight text-white">
                    WELCOME <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                      BACK!
                    </span>
                  </h1>
                ) : (
                  <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold uppercase leading-tight tracking-tight text-white">
                    A New <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                      Polytechnic...
                    </span>
                  </h1>
                )}
                
                <div className="h-px w-16 md:w-24 bg-slate-700" />
                
                <p className="text-sm md:text-lg leading-relaxed text-slate-400 max-w-xl">
                  {isReturningUser ? "As you know, we" : "We"} are redesigning our digital identity from the ground up. You
                  are currently viewing an early release of our 2026 infrastructure.
                </p>
              </div>

              {/* Sidebar / Stats */}
              <div className="lg:col-span-5 flex flex-col justify-end space-y-8 md:space-y-10 lg:pl-12 lg:border-l border-slate-800 pt-8 lg:pt-0 border-t lg:border-t-0 border-slate-800/50">
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-cyan-500 text-xs uppercase tracking-widest mb-2">
                    <Activity className="w-4 h-4" /> Target Launch
                  </div>
                  <div className="text-2xl sm:text-3xl md:text-4xl text-white font-light">
                    March <br /> 2026
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Warning */}
            <div className="mt-12 md:mt-16 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800 pt-6 relative z-10">
               <div className="flex items-center gap-4">
                  <ScanLine className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <span className="text-[10px] uppercase tracking-[0.3em] text-slate-200 animate-pulse font-medium">
                    Click anywhere to enter site
                  </span>
               </div>
               <div className="text-[10px] text-slate-600 font-mono">
                  v0.0.0 Alpha
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

      {/* Flash Fill Screen Overlay */}
      <div className="fixed inset-0 z-[10000] bg-cyan-500 opacity-0 pointer-events-none animate-fill-screen" />

    </div>
  );
}