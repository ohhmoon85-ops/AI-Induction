
import React from 'react';
import { CookingState } from '../types';

interface VisualizerProps {
  state: CookingState;
  temp: number;
  power: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ state, temp, power }) => {
  const tempRatio = Math.min(temp / 100, 1);
  const isBoiling = temp >= 98;
  const showNoodles = state === CookingState.COOKING_INGR_ACTIVE || state === CookingState.PREDICTING_BOILOVER || state === CookingState.COMPLETE;

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="relative w-80 h-80 rounded-[40px] border border-white/10 flex items-center justify-center">
        
        {/* Active Heat Glow */}
        <div 
          className="absolute inset-20 rounded-full blur-3xl transition-all duration-700"
          style={{ 
            backgroundColor: `rgba(255, ${Math.max(0, 150 - temp)}, 50, ${0.3 * (power/10)})`,
            transform: `scale(${0.5 + tempRatio})`,
            opacity: power > 0 ? 1 : 0
          }} 
        />

        {/* The Pot */}
        <div className={`relative w-52 h-52 transition-all duration-500 ${isBoiling ? 'animate-vibrate' : ''}`}>
           {/* Pot body */}
           <div className="w-full h-full rounded-3xl bg-gradient-to-br from-slate-400 to-slate-600 shadow-2xl relative overflow-hidden border border-white/20">
              
              {/* Water Level */}
              <div 
                className="absolute bottom-0 left-0 right-0 bg-blue-500/40 transition-all duration-1000 ease-in-out"
                style={{ height: `${20 + (tempRatio * 60)}%` }}
              >
                {/* Boiling Bubbles & Steam */}
                {isBoiling && (
                  <div className="absolute inset-0">
                    {[...Array(12)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`absolute w-3 h-3 bg-white/60 rounded-full animate-bubble`} 
                        style={{ 
                          left: `${Math.random() * 90}%`, 
                          animationDelay: `${Math.random() * 2}s`,
                          animationDuration: `${0.5 + Math.random()}s`
                        }} 
                      />
                    ))}
                  </div>
                )}

                {/* Ramen Noodles Representation */}
                {showNoodles && (
                  <div className="absolute inset-4 flex flex-col gap-1 opacity-80">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-1 bg-yellow-200/60 rounded-full w-full animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                    <div className="absolute inset-0 bg-red-500/10" /> {/* Soup color */}
                  </div>
                )}
              </div>

              {/* Boil-over Danger Visual */}
              {state === CookingState.PREDICTING_BOILOVER && (
                <div className="absolute top-0 left-0 right-0 h-12 bg-white/20 backdrop-blur-sm animate-pulse flex items-center justify-center">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Power Throttling</span>
                </div>
              )}
           </div>

           {/* Direct Contact Sensor UI */}
           <div className="absolute -right-14 bottom-10">
              <div className="flex items-center gap-2">
                <div className="w-10 h-[2px] bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                <div className="bg-emerald-500 text-[8px] font-bold px-2 py-1 rounded text-white whitespace-nowrap">
                  GROUND TRUTH ACTIVE
                </div>
              </div>
           </div>
        </div>

        {/* Heat Indicator on Plate */}
        <div className="absolute -bottom-10 flex flex-col items-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Magnetic Induction Intensity</div>
          <div className="flex gap-1 h-2 w-48 bg-white/5 rounded-full overflow-hidden">
            {[...Array(10)].map((_, i) => (
              <div key={i} className={`flex-1 transition-all ${i < power ? 'bg-blue-500' : 'bg-transparent'}`} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bubble {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-60px) scale(1.2); opacity: 0; }
        }
        @keyframes vibrate {
          0% { transform: translate(0,0); }
          25% { transform: translate(1px, 1px); }
          50% { transform: translate(-1px, 0); }
          75% { transform: translate(1px, -1px); }
          100% { transform: translate(0,0); }
        }
        .animate-bubble { animation: bubble linear infinite; }
        .animate-vibrate { animation: vibrate 0.1s infinite; }
      `}</style>
    </div>
  );
};

export default Visualizer;
