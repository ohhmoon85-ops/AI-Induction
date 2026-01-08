
import React from 'react';
import { CookingState } from '../types';

interface VisualizerProps {
  state: CookingState;
  temp: number;
  power: number;
  sensorArray: number[];
  isWideZone?: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ state, temp, power, sensorArray, isWideZone }) => {
  const isBoiling = temp >= 98;

  // 특허 도면 5 기반 센서 배치
  const sensorPositions = [
    { x: 50, y: 50 }, // 210 Center
    { x: 50, y: 22 }, { x: 70, y: 30 }, { x: 78, y: 50 }, { x: 70, y: 70 },
    { x: 50, y: 78 }, { x: 30, y: 70 }, { x: 22, y: 50 }, { x: 30, y: 30 }
  ];

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="relative w-80 h-80 rounded-[45px] border border-white/5 flex items-center justify-center bg-black/20">
        
        {/* Heat Map Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden rounded-[40px]">
           {sensorPositions.map((pos, i) => {
             const sTemp = sensorArray[i] || 22;
             const sRatio = Math.min((sTemp - 20) / 160, 1);
             
             // Wide-Zone 활성화 시 블러 반경을 넓혀 열 확산 표현
             const blurRadius = isWideZone ? '60px' : '40px';
             
             return (
               <div 
                 key={i}
                 className="absolute w-36 h-36 rounded-full transition-all duration-1000 opacity-50"
                 style={{ 
                   left: `${pos.x}%`, 
                   top: `${pos.y}%`, 
                   transform: 'translate(-50%, -50%)',
                   filter: `blur(${blurRadius})`,
                   backgroundColor: `rgb(${150 + sRatio * 105}, ${100 - sRatio * 80}, ${50 - sRatio * 30})`
                 }}
               />
             );
           })}
        </div>

        {/* Vessel Container */}
        <div className={`relative w-64 h-64 transition-all duration-700 ${isBoiling ? 'animate-vibrate' : ''}`}>
           <div className="w-full h-full rounded-[2.8rem] bg-gradient-to-br from-slate-400/30 to-slate-800/50 backdrop-blur-md shadow-2xl relative overflow-hidden border border-white/10">
              
              {/* Center Temp Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
                 <div className="bg-black/60 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 shadow-2xl">
                    <span className="text-4xl font-black tabular-nums text-white">
                      {temp.toFixed(1)}°
                    </span>
                 </div>
                 <div className="flex flex-col items-center mt-3 gap-1">
                    <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em]">IR Ground Truth</span>
                    {isWideZone && (
                       <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">Wide-Zone Balancing...</span>
                    )}
                 </div>
              </div>
           </div>

           {/* Coil Flux Visualizer */}
           <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-48 flex flex-col items-center gap-1.5 opacity-80">
              <div className="text-[8px] font-bold text-slate-500 tracking-tighter uppercase">Power Induction Flux (110)</div>
              <div className="flex gap-1 w-full h-1.5 bg-white/5 rounded-full overflow-hidden p-0.5">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className={`flex-1 rounded-sm transition-all duration-300 ${i < power ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)]' : 'bg-white/5'}`} />
                ))}
              </div>
           </div>
        </div>
      </div>

      <style>{`
        @keyframes vibrate {
          0%, 100% { transform: translate(0,0); }
          50% { transform: translate(0.8px, 0.8px); }
        }
        .animate-vibrate { animation: vibrate 0.1s infinite; }
      `}</style>
    </div>
  );
};

export default Visualizer;
