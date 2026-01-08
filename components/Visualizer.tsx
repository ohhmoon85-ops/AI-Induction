
import React from 'react';
import { CookingState } from '../types';

interface VisualizerProps {
  state: CookingState;
  temp: number;
  power: number;
  isEnvelopingMode?: boolean;
  sensorArray: number[];
}

const Visualizer: React.FC<VisualizerProps> = ({ state, temp, power, isEnvelopingMode, sensorArray }) => {
  const tempRatio = Math.min(temp / 100, 1);
  const isBoiling = temp >= 98;
  const showIngredients = state === CookingState.COOKING_INGR_ACTIVE || state === CookingState.COMPLETE;

  // 특허 도면 5: 센서 210(중앙)과 220(주변 8개)의 배치 좌표
  const sensorPositions = [
    { x: 50, y: 50 }, // 210: Center
    { x: 50, y: 20 }, // 220-1
    { x: 72, y: 28 }, // 220-2
    { x: 80, y: 50 }, // 220-3
    { x: 72, y: 72 }, // 220-4
    { x: 50, y: 80 }, // 220-5
    { x: 28, y: 72 }, // 220-6
    { x: 20, y: 50 }, // 220-7
    { x: 28, y: 28 }, // 220-8
  ];

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="relative w-80 h-80 rounded-[45px] border border-white/5 flex items-center justify-center bg-black/20">
        
        {/* Heat Map Layer (Patent-based Multi-point Sensing) */}
        <div className="absolute inset-0 z-0 overflow-hidden rounded-[40px]">
           {sensorPositions.map((pos, i) => {
             const sTemp = sensorArray[i] || 22;
             const sRatio = Math.min((sTemp - 20) / 80, 1);
             return (
               <div 
                 key={i}
                 className="absolute w-32 h-32 rounded-full blur-[40px] transition-all duration-1000 opacity-40"
                 style={{ 
                   left: `${pos.x}%`, 
                   top: `${pos.y}%`, 
                   transform: 'translate(-50%, -50%)',
                   backgroundColor: `rgb(${150 + sRatio * 105}, ${100 - sRatio * 100}, 50)`
                 }}
               />
             );
           })}
        </div>

        {/* Patent Vessel Outline (Real-time Position Feedback) */}
        <div className={`relative w-60 h-60 transition-all duration-700 ${isBoiling ? 'animate-vibrate' : ''}`}>
           <div className="w-full h-full rounded-[2.5rem] bg-gradient-to-br from-slate-500/40 to-slate-800/60 backdrop-blur-sm shadow-2xl relative overflow-hidden border border-white/10">
              
              {/* Boiling Simulation */}
              <div 
                className="absolute bottom-0 left-0 right-0 bg-blue-400/10 transition-all duration-1000 ease-in-out z-10"
                style={{ height: `${25 + (tempRatio * 55)}%` }}
              >
                {isBoiling && (
                  <div className="absolute inset-0">
                    {[...Array(8)].map((_, i) => (
                      <div 
                        key={i} 
                        className="absolute w-2 h-2 bg-white/30 rounded-full animate-bubble" 
                        style={{ left: `${10 + Math.random() * 80}%`, animationDelay: `${Math.random() * 2}s` }} 
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Central Temperature Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
                 <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5">
                    <span className="text-3xl font-black tabular-nums text-white drop-shadow-lg">
                      {temp.toFixed(1)}°
                    </span>
                 </div>
                 <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mt-2">IR Ground Truth</span>
              </div>

              {/* Disturbance Indicator (Patent Disturbances) */}
              {state === CookingState.DISTURBANCE_DETECTED && (
                <div className="absolute inset-0 bg-red-500/10 border-4 border-red-500/30 animate-pulse z-40 flex items-center justify-center">
                   <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg uppercase">Disturbance Detected</span>
                </div>
              )}
           </div>

           {/* Core Coil Flux (Patent Component 110) */}
           <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-40 flex flex-col items-center gap-1 opacity-60">
              <div className="text-[8px] font-bold text-slate-500 tracking-tighter">WORKING COIL (110) FLUX</div>
              <div className="flex gap-0.5 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className={`flex-1 ${i < power ? 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)]' : ''}`} />
                ))}
              </div>
           </div>
        </div>
      </div>

      <style>{`
        @keyframes bubble {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          100% { transform: translateY(-50px) scale(1.5); opacity: 0; }
        }
        @keyframes vibrate {
          0%, 100% { transform: translate(0,0); }
          50% { transform: translate(0.5px, 0.5px); }
        }
        .animate-bubble { animation: bubble linear infinite 1.2s; }
        .animate-vibrate { animation: vibrate 0.1s infinite; }
      `}</style>
    </div>
  );
};

export default Visualizer;
