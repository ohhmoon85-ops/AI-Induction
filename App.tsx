
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  Thermometer, 
  Waves, 
  Play,
  Square,
  Clock,
  Timer,
  CheckCircle2,
  Layers,
  BarChart2,
  Database,
  Flame,
  LayoutGrid,
  Bell,
  ShieldAlert,
  ChevronRight,
  Info,
  CalendarDays,
  Target,
  Search,
  Settings,
  Cpu,
  AlertTriangle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SensorData, CookingState, RECIPES, Recipe, CookingType, VesselInfo } from './types';

// Components
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
  
  // 특허 기반 상태
  const [cookingType, setCookingType] = useState<CookingType>('UNKNOWN');
  const [vessel, setVessel] = useState<VesselInfo>({ material: 'Stainless', size: 'Medium', alignment: 'Centered' });
  const [sensorArray, setSensorArray] = useState<number[]>(new Array(9).fill(22));
  
  // 예약 및 안전 설정
  const [isReservationMode, setIsReservationMode] = useState(false);
  const [targetTime, setTargetTime] = useState("08:00");
  const [startTime, setStartTime] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    // 1. 센서 어레이 시뮬레이션
    const newSensorArray = sensorArray.map((s, i) => {
      if (!isRunning) return Math.max(22, s - 0.4);
      const baseHeat = nextPower * 0.9;
      const noise = (Math.random() - 0.5) * 2;
      const posFactor = i === 0 ? 1 : 0.82 + (Math.random() * 0.12);
      return Math.min(250, s + (baseHeat * posFactor) + noise);
    });
    setSensorArray(newSensorArray);
    nextGroundTruth = newSensorArray[0];

    // 2. 특허 기반 조리 형태 인지
    if (isRunning && history.length < 50 && (selectedRecipe.id === 'auto' || selectedRecipe.id === 'ramen')) {
      if (history.length > 5 && cookingType === 'UNKNOWN') {
        const rateOfRise = (nextGroundTruth - history[0].groundTruthTemp) / history.length;
        if (rateOfRise > 1.5) setCookingType('FRYING');
        else if (rateOfRise > 0.4) setCookingType('BOILING');
        else setCookingType('SIMMERING');
        
        setVessel({ material: rateOfRise > 0.8 ? 'Stainless' : 'Cast Iron', size: 'Medium', alignment: 'Centered' });
      }
    }

    // 3. 온도 제어 및 상태 전환
    if (isRunning) {
      const target = selectedRecipe.id === 'auto' ? (cookingType === 'FRYING' ? 180 : 100) : selectedRecipe.targetTemp;
      
      // 넘침 감지 시뮬레이션 (특히 라면 조리 시)
      if (state === CookingState.COOKING_INGR_ACTIVE && !selectedRecipe.isEnvelopingRequired) {
        // 면 투하 후 끓어오를 확률 시뮬레이션
        if (nextGroundTruth >= target - 2 && Math.random() > 0.985) {
          nextState = CookingState.PREDICTING_BOILOVER;
        }
      }

      if (nextState === CookingState.PREDICTING_BOILOVER) {
        nextPower = 2; // 즉시 화력 하향
        // 5초 후 거품이 가라앉으면 복귀
        setTimeout(() => setState(CookingState.COOKING_INGR_ACTIVE), 5000);
      } else if (nextGroundTruth >= target + 0.5) {
        nextPower = 1;
      } else {
        nextPower = selectedRecipe.isEnvelopingRequired ? 6 : 10;
      }

      if (state === CookingState.HEATING_WATER && nextGroundTruth >= target - 1) {
        if (selectedRecipe.id === 'ramen' || !selectedRecipe.autoStartCook) {
          nextState = CookingState.WAITING_FOR_INGREDIENTS;
          setIsRunning(false); // 재료 투하 전 일시정지
        } else {
          nextState = CookingState.COOKING_INGR_ACTIVE;
          nextRemainingTime = selectedRecipe.cookTime || 300;
        }
      } else if (state === CookingState.COOKING_INGR_ACTIVE) {
        nextRemainingTime = Math.max(0, remainingTime - 0.2);
        if (nextRemainingTime <= 0) {
          nextState = CookingState.COMPLETE;
          setIsRunning(false);
        }
      }

      // 외란 감지 시뮬레이션
      if (Math.random() > 0.998 && state === CookingState.COOKING_INGR_ACTIVE) {
        nextState = CookingState.DISTURBANCE_DETECTED;
        nextPower = 1;
        setTimeout(() => setState(CookingState.COOKING_INGR_ACTIVE), 3000);
      }
    }

    setState(nextState);
    setRemainingTime(nextRemainingTime);
    setPower(isRunning ? nextPower : (state === CookingState.IDLE ? 0 : power));

    setHistory(prev => [...prev, {
      time: lastData.time + 1,
      legacyTemp: nextGroundTruth - 5,
      groundTruthTemp: nextGroundTruth,
      vibration: isRunning ? 5 + Math.random() * 5 : 2,
      soundFrequency: 100 + nextGroundTruth,
      powerLevel: isRunning ? nextPower : 0,
      heatUniformity: 95 + Math.random() * 5,
      sensorArray: newSensorArray
    }].slice(-60));

  }, [state, power, remainingTime, isRunning, selectedRecipe, startTime, history, cookingType, sensorArray]);

  useEffect(() => {
    if (isRunning || state === CookingState.RESERVED || state === CookingState.COMPLETE || state === CookingState.WAITING_FOR_INGREDIENTS) {
      timerRef.current = setInterval(simulateStep, 200);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, state, simulateStep]);

  const handleStart = () => {
    if (isReservationMode) {
      const [hours, minutes] = targetTime.split(':').map(Number);
      const targetDate = new Date();
      targetDate.setHours(hours, minutes, 0, 0);
      if (targetDate.getTime() < Date.now()) targetDate.setDate(targetDate.getDate() + 1);
      
      const startTimestamp = targetDate.getTime() - (selectedRecipe.cookTime + 180) * 1000;
      setStartTime(new Date(startTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      setState(CookingState.RESERVED);
    } else {
      setIsRunning(true);
      setState(CookingState.HEATING_WATER);
      setRemainingTime(selectedRecipe.cookTime);
      setCookingType('UNKNOWN');
    }
    setHistory([]);
  };

  const handleAddIngredients = () => {
    setIsRunning(true);
    setState(CookingState.COOKING_INGR_ACTIVE);
    setRemainingTime(selectedRecipe.cookTime);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Ground Truth':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
             <div className="glass rounded-[2rem] p-8 border border-white/5">
                <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><Cpu className="text-blue-500" /> 센서 어레이 실시간 피드백</h3>
                <div className="grid grid-cols-3 gap-4">
                   {sensorArray.map((s, i) => (
                     <div key={i} className={`p-4 rounded-2xl border transition-all ${i === 0 ? 'bg-blue-600/10 border-blue-500' : 'bg-white/5 border-white/10'}`}>
                        <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-tighter">{i === 0 ? 'Main IR (210)' : `Sub IR ${i} (220)`}</p>
                        <p className="text-xl font-black text-white tabular-nums">{s.toFixed(1)}°</p>
                     </div>
                   ))}
                </div>
                <div className="mt-8 p-6 bg-orange-500/5 rounded-3xl border border-orange-500/10 flex items-center gap-4">
                   <AlertTriangle className="text-orange-500 w-8 h-8 shrink-0" />
                   <p className="text-xs text-orange-300 leading-relaxed font-medium">
                     * AI-Safety: 센서 220번대에서 급격한 습도/온도 스파이크 발생 시 라면 면발에 의한 넘침으로 판단하여 화력을 즉각 차단합니다.
                   </p>
                </div>
             </div>
             <div className="glass rounded-[2rem] p-8 border border-white/5 flex flex-col justify-center items-center text-center">
                <Target className="w-16 h-16 text-orange-500 mb-6 animate-pulse" />
                <h4 className="text-2xl font-black text-white mb-2">Vessel Profile Analysis</h4>
                <div className="space-y-4 w-full max-w-xs mt-4">
                   <div className="flex justify-between p-4 bg-white/5 rounded-2xl">
                      <span className="text-slate-500 text-sm">Material</span>
                      <span className="font-bold text-orange-400">{vessel.material}</span>
                   </div>
                   <div className="flex justify-between p-4 bg-white/5 rounded-2xl">
                      <span className="text-slate-500 text-sm">Alignment</span>
                      <span className="font-bold text-emerald-400">{vessel.alignment}</span>
                   </div>
                   <div className="flex justify-between p-4 bg-white/5 rounded-2xl">
                      <span className="text-slate-500 text-sm">Recognized Mode</span>
                      <span className="font-bold text-blue-400">{cookingType}</span>
                   </div>
                </div>
             </div>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
            <div className="lg:col-span-8 space-y-6 relative">
              
              {/* Recipe Selector */}
              <div className="glass rounded-3xl p-4 border border-white/5 flex gap-4 overflow-x-auto no-scrollbar">
                {RECIPES.map((r) => (
                  <button
                    key={r.id}
                    disabled={isRunning || state !== CookingState.IDLE}
                    onClick={() => {setSelectedRecipe(r); setRemainingTime(r.cookTime);}}
                    className={`flex flex-col items-center gap-2 p-4 min-w-[100px] rounded-2xl border transition-all ${
                      selectedRecipe.id === r.id ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'
                    } ${isRunning || state !== CookingState.IDLE ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-2xl">{r.icon}</span>
                    <span className="text-[10px] font-bold uppercase">{r.name}</span>
                  </button>
                ))}
              </div>

              {/* Main Visualizer */}
              <div className="glass rounded-[2.5rem] p-8 border border-white/5 h-[520px] relative overflow-hidden">
                
                {/* Boilover Prediction Alert Overlay */}
                {state === CookingState.PREDICTING_BOILOVER && (
                  <div className="absolute inset-0 z-40 bg-orange-600/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
                     <div className="bg-orange-600 text-white p-6 rounded-[2rem] shadow-2xl flex flex-col items-center gap-3">
                        <AlertTriangle className="w-12 h-12" />
                        <h3 className="text-xl font-black uppercase tracking-tighter text-center">Boilover Predicted!<br/>Reducing Power Level...</h3>
                     </div>
                  </div>
                )}

                {/* Waiting for Ingredients Overlay */}
                {state === CookingState.WAITING_FOR_INGREDIENTS && (
                  <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-md flex items-center justify-center">
                     <div className="text-center space-y-6">
                        <div className="p-6 bg-blue-600 rounded-full animate-bounce mx-auto w-fit shadow-2xl shadow-blue-900/40">
                          <UtensilsCrossed className="w-10 h-10 text-white" />
                        </div>
                        <div className="space-y-2">
                           <h2 className="text-3xl font-black text-white">물 끓임 완료!</h2>
                           <p className="text-blue-100 opacity-80">이제 면과 스프를 넣어주세요.</p>
                        </div>
                        <button 
                          onClick={handleAddIngredients}
                          className="px-8 py-4 bg-white text-blue-700 rounded-2xl font-black text-lg hover:bg-slate-100 active:scale-95 transition-all shadow-xl"
                        >
                          투하 완료 (조리 시작)
                        </button>
                     </div>
                  </div>
                )}

                <div className="absolute top-8 left-8 z-10 space-y-1">
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Patent-Induction Active</p>
                   <h2 className="text-2xl font-black text-white">{selectedRecipe.name} {isReservationMode ? '예약 대기' : (isRunning ? '조리 중' : '시스템 준비')}</h2>
                   <div className="flex gap-3 mt-4">
                      <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                         <span className="text-[10px] block text-slate-500 font-bold uppercase mb-1">Status</span>
                         <span className="text-xs font-bold text-blue-400">{state.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                         <span className="text-[10px] block text-slate-500 font-bold uppercase mb-1">Timer</span>
                         <span className="text-xs font-bold text-emerald-400 tabular-nums">
                           {state === CookingState.RESERVED ? `${startTime}` : 
                            `${Math.floor(remainingTime/60)}:${Math.floor(remainingTime%60).toString().padStart(2, '0')}`}
                         </span>
                      </div>
                   </div>
                </div>

                <Visualizer 
                  state={state} 
                  temp={history[history.length-1]?.groundTruthTemp || 22} 
                  power={power}
                  sensorArray={sensorArray}
                />

                <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center">
                  <div className="flex gap-3 items-center bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/5">
                     <button 
                       disabled={isRunning || state !== CookingState.IDLE}
                       onClick={() => setIsReservationMode(!isReservationMode)}
                       className={`px-4 py-3 rounded-xl text-xs font-bold transition-all ${isReservationMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5'}`}
                     >
                       {isReservationMode ? '예약 ON' : '완료 시각 예약'}
                     </button>
                     {isReservationMode && (
                       <div className="flex items-center gap-2 pr-2">
                          <Clock className="w-4 h-4 text-indigo-400" />
                          <input type="time" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} className="bg-transparent text-white font-bold outline-none border-b border-indigo-500 px-1 text-sm" />
                       </div>
                     )}
                  </div>

                  <div className="flex gap-3">
                    {!isRunning && state === CookingState.IDLE ? (
                      <button onClick={handleStart} className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-xl shadow-blue-900/40 transition-all flex items-center gap-3">
                        <Play className="w-5 h-5 fill-current" /> {isReservationMode ? '예약 확정' : '조리 시작'}
                      </button>
                    ) : (
                      <button onClick={() => {setIsRunning(false); setState(CookingState.IDLE); setRemainingTime(0);}} className="p-4 bg-red-600/10 text-red-500 rounded-2xl border border-red-500/20 hover:bg-red-600/20 transition-all">
                        <Square className="w-6 h-6 fill-current" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="glass rounded-[2rem] p-6 border border-white/5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <BarChart2 className="w-4 h-4 text-blue-500" /> AI 조리 데이터 분석
                    </h4>
                    <div className="h-40">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={history}>
                             <defs>
                                <linearGradient id="colorGT" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                   <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                             </defs>
                             <Area type="monotone" dataKey="groundTruthTemp" stroke="#3b82f6" fill="url(#colorGT)" strokeWidth={3} isAnimationActive={false} />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
                 <div className="glass rounded-[2rem] p-6 border border-white/5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4 text-emerald-500" /> 안전 프로토콜
                    </h4>
                    <div className="space-y-4">
                       <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                          <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">Auto-Off Ready</p>
                          <p className="text-xs text-slate-300">조리 완료 후 사용자의 동작이 10분간 감지되지 않을 시 전원을 자동으로 차단합니다.</p>
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            {/* Timeline Sidebar */}
            <div className="lg:col-span-4 space-y-6">
               <div className="glass rounded-[2rem] p-8 border border-white/5">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2"><Clock className="w-5 h-5" /> 조리 타임라인</h3>
                  <div className="space-y-8 relative">
                     <div className="absolute left-3 top-2 bottom-2 w-[1px] bg-white/5" />
                     <TimelineItem done={state !== CookingState.IDLE && state !== CookingState.RESERVED} active={state === CookingState.RESERVED} label={`예약 대기 (${startTime || '--:--'})`} />
                     <TimelineItem done={state === CookingState.COOKING_INGR_ACTIVE || state === CookingState.COMPLETE} active={state === CookingState.HEATING_WATER || state === CookingState.WAITING_FOR_INGREDIENTS} label="수온 가열 및 재료 대기" />
                     <TimelineItem done={state === CookingState.COMPLETE} active={state === CookingState.COOKING_INGR_ACTIVE || state === CookingState.PREDICTING_BOILOVER} label="AI 자율 최적 제어" />
                     <TimelineItem done={false} active={state === CookingState.COMPLETE} label="조리 완료 및 자동 차단 대기" />
                  </div>
               </div>

               <div className="glass rounded-[2rem] p-8 border border-white/5 bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
                  <h4 className="text-sm font-bold text-white mb-4">Recipe Insight: {selectedRecipe.name}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {selectedRecipe.description}
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                     <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500 uppercase font-bold">Target Temp</span>
                        <span className="text-blue-400 font-black">{selectedRecipe.targetTemp}°C</span>
                     </div>
                     <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500 uppercase font-bold">Estimated Time</span>
                        <span className="text-blue-400 font-black">{Math.floor(selectedRecipe.cookTime / 60)}분</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0c] text-slate-100 font-inter">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 flex flex-col overflow-y-auto p-4 lg:p-6 space-y-6">
        <Header activeTab={activeTab} />
        <div className="flex-1">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

const TimelineItem: React.FC<{ done: boolean, active: boolean, label: string }> = ({ done, active, label }) => (
  <div className={`relative flex items-center gap-6 pl-1 transition-all duration-500 ${active ? 'opacity-100 translate-x-1' : 'opacity-30'}`}>
    <div className={`w-4 h-4 rounded-full z-10 ${done ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : active ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`} />
    <span className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-400'}`}>{label}</span>
  </div>
);

// Lucide icon helper for the overlay
const UtensilsCrossed: React.FC<any> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3a4.2 4.2 0 0 0 6 0L22 11"/><polyline points="8 11 11 11 11 14"/>
  </svg>
);

export default App;
