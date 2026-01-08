
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Zap, ShieldCheck, Thermometer, Waves, Play, Square, Clock, Timer, 
  CheckCircle2, Layers, BarChart2, Database, Flame, LayoutGrid, Bell, 
  ShieldAlert, ChevronRight, Info, CalendarDays, Target, Search, Settings, 
  Cpu, AlertTriangle, UtensilsCrossed, Minimize2, Maximize2, Move, Scan
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SensorData, CookingState, RECIPES, Recipe, CookingType, VesselInfo } from './types';

import Header from './components/Header';
import MetricCard from './components/MetricCard';
import Visualizer from './components/Visualizer';
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [state, setState] = useState<CookingState>(CookingState.IDLE);
  const [power, setPower] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(RECIPES[0]);
  
  const [cookingType, setCookingType] = useState<CookingType>('UNKNOWN');
  const [vessel, setVessel] = useState<VesselInfo>({ material: 'Unknown', size: 'Medium', alignment: 'Centered' });
  const [sensorArray, setSensorArray] = useState<number[]>(new Array(9).fill(22));
  const [thermalGradient, setThermalGradient] = useState(0); 
  const [isWideZoneActive, setIsWideZoneActive] = useState(false); 
  
  const [isReservationMode, setIsReservationMode] = useState(false);
  const [targetTime, setTargetTime] = useState("08:00");
  const [startTime, setStartTime] = useState<string | null>(null);

  const peripheralAvg = sensorArray.slice(1).reduce((a, b) => a + b, 0) / 8;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getDynamicTarget = () => {
    if (selectedRecipe.id !== 'auto') return { temp: selectedRecipe.targetTemp, time: selectedRecipe.cookTime };
    if (cookingType === 'FRYING') return { temp: 180, time: 600 };
    if (cookingType === 'PANCAKE') return { temp: 180, time: 600 };
    if (cookingType === 'BOILING') return { temp: 100, time: 480 };
    return { temp: 100, time: 0 };
  };

  const dynamicMeta = getDynamicTarget();

  const simulateStep = useCallback(() => {
    if (state === CookingState.RESERVED) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      if (now === startTime) {
        setIsRunning(true);
        setState(CookingState.HEATING_WATER);
        setPower(10);
      }
      return; 
    }

    const lastData = history[history.length - 1] || { time: 0, groundTruthTemp: 22 };
    let nextGroundTruth = lastData.groundTruthTemp;
    let nextPower = power;
    let nextState = state;
    let nextRemainingTime = remainingTime;

    const centerTemp = sensorArray[0];
    const gradient = centerTemp - peripheralAvg;
    setThermalGradient(gradient);

    const shouldBalance = (selectedRecipe.id === 'pancake' || cookingType === 'PANCAKE' || cookingType === 'FRYING') && gradient > 25;
    setIsWideZoneActive(shouldBalance);

    const isWater = cookingType === 'BOILING' || (selectedRecipe.id !== 'auto' && selectedRecipe.targetTemp <= 105);
    const tempLimit = isWater ? 101.5 : 260;
    const targetTemp = dynamicMeta.temp;

    const newSensorArray = sensorArray.map((s, i) => {
      if (!isRunning && state !== CookingState.COMPLETE) return Math.max(22, s - 0.4);
      let heatGain = nextPower * 0.95;
      const isCenter = i === 0;
      if (shouldBalance) {
        if (isCenter) heatGain *= 0.4;
        else heatGain *= 1.2;
      }
      const noise = (Math.random() - 0.5) * 1.5;
      const posFactor = isCenter ? 1 : 0.7 + (Math.random() * 0.1);
      let nextTemp = s + (heatGain * posFactor) + noise;
      if (nextPower <= 1 && nextTemp > targetTemp) {
        nextTemp = Math.max(targetTemp, nextTemp - 0.3);
      }
      return Math.min(tempLimit, nextTemp);
    });
    setSensorArray(newSensorArray);
    nextGroundTruth = newSensorArray[0];

    if (isRunning && history.length > 8) {
      const deltaT = nextGroundTruth - history[0].groundTruthTemp;
      const rateOfRise = deltaT / history.length;

      if (cookingType === 'UNKNOWN') {
        let type: CookingType = 'UNKNOWN';
        if (rateOfRise > 1.8) type = 'FRYING';
        else if (rateOfRise > 1.3) type = 'PANCAKE';
        else if (rateOfRise > 0.5) type = 'BOILING';

        if (type !== 'UNKNOWN') {
          setCookingType(type);
          if (selectedRecipe.id === 'auto') {
            nextRemainingTime = type === 'PANCAKE' ? 600 : (type === 'FRYING' ? 600 : 480);
          }
        }
      }

      // 'AI 자동 인지' 모드에서만 용기 식별 수행
      if (selectedRecipe.id === 'auto' && vessel.material === 'Unknown' && history.length > 15) {
        const material: any = rateOfRise > 1.1 ? 'Stainless' : 'Cast Iron';
        const peripheralAvgValue = newSensorArray.slice(1).reduce((a, b) => a + b, 0) / 8;
        const size: any = peripheralAvgValue > nextGroundTruth * 0.82 ? 'Large' : 'Small';
        const variance = Math.max(...newSensorArray.slice(1)) - Math.min(...newSensorArray.slice(1));
        setVessel({ material, size, alignment: variance > 12 ? 'Eccentric' : 'Centered' });
      }
    }

    if (isRunning) {
      if (nextGroundTruth >= targetTemp) {
        nextPower = shouldBalance ? 2 : (isWater ? 3 : 0);
      } else if (nextGroundTruth >= targetTemp - 15) {
        nextPower = shouldBalance ? 5 : 4; 
      } else {
        nextPower = selectedRecipe.isEnvelopingRequired ? 7 : 10;
      }

      // 타이머 작동 로직 (HEATING -> ACTIVE 전환 및 시간 감소)
      if (state === CookingState.HEATING_WATER && nextGroundTruth >= targetTemp - 2) {
        nextState = CookingState.COOKING_INGR_ACTIVE;
      } else if (state === CookingState.COOKING_INGR_ACTIVE) {
        nextRemainingTime = Math.max(0, remainingTime - 0.2); // 시뮬레이션 속도에 맞춰 감소
        if (nextRemainingTime <= 0) {
          nextState = CookingState.COMPLETE;
          setIsRunning(false);
          nextPower = 0;
        }
      }
    }

    setState(nextState);
    setRemainingTime(nextRemainingTime);
    setPower(isRunning ? nextPower : 0);

    setHistory(prev => [...prev, {
      time: lastData.time + 1,
      legacyTemp: nextGroundTruth - 5,
      groundTruthTemp: nextGroundTruth,
      vibration: isRunning ? 5 : 2,
      soundFrequency: 100 + nextGroundTruth,
      powerLevel: isRunning ? nextPower : 0,
      heatUniformity: 100 - (gradient / 2),
      sensorArray: newSensorArray
    }].slice(-60));

  }, [state, power, remainingTime, isRunning, selectedRecipe, startTime, history, cookingType, sensorArray, dynamicMeta, peripheralAvg, vessel.material]);

  useEffect(() => {
    if (isRunning || state === CookingState.RESERVED || state === CookingState.COMPLETE) {
      timerRef.current = setInterval(simulateStep, 200);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, state, simulateStep]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0c] text-slate-100 font-inter">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 flex flex-col overflow-y-auto p-4 lg:p-6 space-y-6">
        <Header activeTab={activeTab} />
        
        <div className="flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
            <div className="lg:col-span-8 space-y-6 relative">
              
              <div className="glass rounded-3xl p-4 border border-white/5 flex gap-4 overflow-x-auto no-scrollbar">
                {RECIPES.map((r) => (
                  <button
                    key={r.id}
                    disabled={isRunning}
                    onClick={() => {
                      setSelectedRecipe(r); 
                      setRemainingTime(r.cookTime); 
                      setCookingType('UNKNOWN');
                      setState(CookingState.IDLE);
                    }}
                    className={`flex flex-col items-center gap-2 p-4 min-w-[100px] rounded-2xl border transition-all ${
                      selectedRecipe.id === r.id ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-transparent text-slate-500'
                    }`}
                  >
                    <span className="text-2xl">{r.icon}</span>
                    <span className="text-[10px] font-bold uppercase">{r.name}</span>
                  </button>
                ))}
              </div>

              <div className="glass rounded-[2.5rem] p-8 border border-white/5 h-[530px] relative overflow-hidden">
                
                {isWideZoneActive && (
                   <div className="absolute top-8 right-8 z-20 animate-in slide-in-from-right">
                      <div className="bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-xl px-4 py-2 rounded-2xl flex items-center gap-3">
                         <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                         <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">균일 가열 알고리즘 가동 중</span>
                      </div>
                   </div>
                )}

                <div className="absolute top-8 left-8 z-10 space-y-1">
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Autonomous Control</p>
                   <h2 className="text-3xl font-black text-white">{selectedRecipe.name}</h2>
                   <div className="flex gap-4 mt-6">
                      <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                         <span className="text-[10px] block text-slate-500 font-bold uppercase mb-1">State</span>
                         <span className="text-xs font-bold text-blue-400">{state.replace(/_/g, ' ')}</span>
                      </div>
                      
                      {/* AI 자동 인지 모드에서만 Vessel ID 표시 */}
                      {selectedRecipe.id === 'auto' && (
                        <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md animate-in fade-in zoom-in duration-500">
                           <span className="text-[10px] block text-slate-500 font-bold uppercase mb-1">Vessel ID</span>
                           <span className="text-xs font-bold text-orange-400">{vessel.material} / {vessel.size}</span>
                        </div>
                      )}

                      <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                         <span className="text-[10px] block text-slate-500 font-bold uppercase mb-1">Time Left</span>
                         <span className="text-xs font-bold text-white tabular-nums">
                           {Math.floor(remainingTime/60)}:{Math.floor(remainingTime%60).toString().padStart(2, '0')}
                         </span>
                      </div>
                   </div>
                </div>

                <Visualizer 
                  state={state} 
                  temp={history[history.length-1]?.groundTruthTemp || 22} 
                  power={power}
                  sensorArray={sensorArray}
                  isWideZone={isWideZoneActive}
                />

                <div className="absolute bottom-8 left-8 right-8 flex justify-end">
                  {!isRunning ? (
                    <button onClick={() => {
                      setIsRunning(true);
                      setState(CookingState.HEATING_WATER);
                      if (history.length === 0) {
                        setVessel({ material: 'Unknown', size: 'Medium', alignment: 'Centered' });
                      }
                    }} className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black shadow-2xl flex items-center gap-3">
                      <Play className="w-6 h-6 fill-current" /> 조리 시작
                    </button>
                  ) : (
                    <button onClick={() => {setIsRunning(false); setState(CookingState.IDLE);}} className="p-5 bg-red-600/10 text-red-500 rounded-2xl border border-red-500/20">
                      <Square className="w-7 h-7 fill-current" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="glass rounded-[2rem] p-6 border border-white/5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <BarChart2 className="w-4 h-4 text-blue-500" /> 열 균일도 (Uniformity Score)
                    </h4>
                    <div className="h-32">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={history}>
                             <Area type="monotone" dataKey="heatUniformity" stroke="#10b981" fillOpacity={0.1} fill="#10b981" strokeWidth={2} isAnimationActive={false} />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
                 <div className="glass rounded-[2rem] p-6 border border-white/5 flex flex-col justify-center gap-4">
                    <div className="flex justify-between items-center">
                       <span className="text-xs text-slate-500 font-bold uppercase">중앙 온도 (210)</span>
                       <span className="text-lg font-black text-white">{sensorArray[0].toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-xs text-slate-500 font-bold uppercase">외곽 평균 (220)</span>
                       <span className="text-lg font-black text-slate-300">{peripheralAvg.toFixed(1)}°</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2">
                       <div 
                         className="h-full bg-blue-500 transition-all duration-500" 
                         style={{ width: `${Math.max(0, 100 - (thermalGradient * 2))}%` }} 
                       />
                    </div>
                 </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
               <div className="glass rounded-[2rem] p-8 border border-white/5 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border-blue-500/20">
                  <h4 className="text-sm font-black text-white mb-4 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" /> Cooking Insight</h4>
                  
                  {/* AI 자동 인지 모드에서만 Vessel Status 카드 표시 */}
                  {selectedRecipe.id === 'auto' ? (
                    <div className="mb-6 p-4 bg-black/40 rounded-2xl border border-white/10 space-y-3 animate-in fade-in duration-700">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">
                          <Scan className="w-3 h-3" /> Vessel Recognition
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400">Material</span>
                          <span className="text-xs font-black text-white">{vessel.material}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400">Size</span>
                          <span className="text-xs font-black text-white">{vessel.size}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400">Alignment</span>
                          <span className="text-xs font-black text-white">{vessel.alignment}</span>
                       </div>
                    </div>
                  ) : (
                    <div className="mb-6 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 space-y-3">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">
                          <Target className="w-3 h-3" /> Recipe Specific Tips
                       </div>
                       <p className="text-[11px] text-slate-400 leading-tight">
                         현재 {selectedRecipe.name} 모드가 활성화되었습니다. {selectedRecipe.targetTemp}°C 항온 제어를 통해 최상의 맛을 구현합니다.
                       </p>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    {selectedRecipe.id === 'pancake' || cookingType === 'PANCAKE' 
                      ? "특허 기반 '균일 가열' 모드입니다. 중앙 온도가 180°C를 넘지 않도록 미세 펄스 제어하며 팬 외곽까지 열을 확산시킵니다." 
                      : selectedRecipe.description}
                  </p>
                  
                  <div className="pt-6 border-t border-white/10 space-y-4">
                     <div className="flex justify-between">
                        <span className="text-[10px] text-slate-500 uppercase font-black">Target Temp</span>
                        <span className="text-xs font-black text-blue-400">{dynamicMeta.temp}°C</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-[10px] text-slate-500 uppercase font-black">Control Mode</span>
                        <span className="text-xs font-black text-emerald-400">{isWideZoneActive ? 'WIDE BALANCED' : 'NORMAL'}</span>
                     </div>
                  </div>
               </div>

               <div className="glass rounded-[2rem] p-8 border border-white/5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                     <Database className="w-4 h-4" /> Multi-Sensor Array
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {sensorArray.map((s, i) => (
                      <div key={i} className={`p-2 rounded-lg border text-center ${i === 0 ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/5'}`}>
                        <span className="text-[9px] block text-slate-600 font-bold mb-0.5">{i === 0 ? 'CENTER' : `S${i}`}</span>
                        <span className="text-[11px] font-black text-slate-300">{s.toFixed(0)}°</span>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
