
import React from 'react';
import { CookingState } from '../types';

interface VisualizerProps {
  state: CookingState;
  temp: number;
  power: number;
  isEnvelopingMode?: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ state, temp, power, isEnvelopingMode }) => {
  const tempRatio = Math.min(temp / 100, 1);
  const isBoiling = temp >= 98;
  const showIngredients = state === CookingState.COOKING_INGR_ACTIVE || state === CookingState.PREDICTING_BOILOVER || state === CookingState.COMPLETE;

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="relative w-80 h-80 rounded-[40px] border border-white/10 flex items-center justify-center">
        
        {/* Active Heat Glow (Central) */}
        <div 
          className="absolute inset-20 rounded-full blur-3xl transition-all duration-700"
          style={{ 
            backgroundColor: `rgba(255, ${Math.max(0, 150 - temp)}, 50, ${0.3 * (power/10)})`,
            transform: `scale(${0.5 + tempRatio})`,
            opacity: power > 0 ? 1 : 0
          }} 
        />

        {/* Enveloping Heat Simulation (Sides) */}
        {isEnvelopingMode && power > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="w-64 h-64 rounded-full border-[20px] border-orange-500/10 blur-xl animate-pulse" />
             <div className="absolute w-72 h-72 rounded-full border-[2px] border-orange-400/20 animate-ping opacity-30" />
          </div>
        )}

        {/* The Pot */}
        <div className={`relative w-56 h-56 transition-all duration-500 ${isBoiling ? 'animate-vibrate' : ''}`}>
           {/* Pot body */}
           <div className="w-full h-full rounded-3xl bg-gradient-to-br from-slate-400 to-slate-600 shadow-2xl relative overflow-hidden border border-white/20">
              
              {/* Heat rising on sides (Visual for Enveloping) */}
              {isEnvelopingMode && power > 0 && (
                <div className="absolute inset-0 z-0">
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-orange-500/20 to-transparent animate-pulse" />
                  <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-orange-500/20 to-transparent animate-pulse" />
                </div>
              )}

              {/* Water/Content Level */}
              <div 
                className="absolute bottom-0 left-0 right-0 bg-blue-500/20 transition-all duration-1000 ease-in-out z-10"
                style={{ height: `${20 + (tempRatio * 60)}%` }}
              >
                {/* Boiling Bubbles */}
                {isBoiling && (
                  <div className="absolute inset-0">
                    {[...Array(12)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`absolute w-3 h-3 bg-white/40 rounded-full animate-bubble`} 
                        style={{ 
                          left: `${Math.random() * 90}%`, 
                          animationDelay: `${Math.random() * 2}s`
                        }} 
                      />
                    ))}
                  </div>
                )}

                {/* Content Representation */}
                {showIngredients && (
                  <div className="absolute inset-4 flex items-center justify-center">
                    <div className="w-full h-4 bg-yellow-200/40 rounded-full blur-[2px] animate-pulse" />
                    <div className="absolute inset-0 bg-orange-500/5" />
                  </div>
                )}
              </div>

              {/* Boil-over Danger Visual */}
              {state === CookingState.PREDICTING_BOILOVER && (
                <div className="absolute top-0 left-0 right-0 h-12 bg-white/20 backdrop-blur-sm animate-pulse flex items-center justify-center z-20">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">AI Heat Modulation</span>
                </div>
              )}
           </div>

           {/* Sensors Indicator */}
           <div className="absolute -right-16 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-[2px] ${isEnvelopingMode ? 'bg-orange-500 shadow-[0_0_10px_#f97316]' : 'bg-blue-500 shadow-[0_0_10px_#3b82f6]'}`} />
                <div className={`text-[8px] font-bold px-2 py-1 rounded text-white whitespace-nowrap ${isEnvelopingMode ? 'bg-orange-600' : 'bg-blue-600'}`}>
                  {isEnvelopingMode ? 'ENVELOPING MODE' : 'DIRECT MODE'}
                </div>
              </div>
           </div>
        </div>

        {/* Magnetic Induction Bars */}
        <div className="absolute -bottom-10 flex flex-col items-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Magnetic Flux Core</div>
          <div className="flex gap-1 h-1.5 w-48 bg-white/5 rounded-full overflow-hidden">
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className={`flex-1 transition-all duration-300 ${
                  i < power 
                    ? (isEnvelopingMode ? 'bg-orange-500' : 'bg-blue-500') 
                    : 'bg-transparent'
                }`} 
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bubble {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translateY(-60px) scale(1.2); opacity: 0; }
        }
        @keyframes vibrate {
          0% { transform: translate(0,0); }
          25% { transform: translate(0.5px, 0.5px); }
          50% { transform: translate(-0.5px, 0); }
          75% { transform: translate(0.5px, -0.5px); }
          100% { transform: translate(0,0); }
        }
        .animate-bubble { animation: bubble linear infinite 1s; }
        .animate-vibrate { animation: vibrate 0.1s infinite; }
      `}</style>
    </div>
  );
};

export default Visualizer;
