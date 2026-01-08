
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  Thermometer, 
  Waves, 
  Play,
  Square,
  Clock,
  UtensilsCrossed,
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
  CalendarDays
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { SensorData, CookingState, RECIPES, Recipe } from './types';

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
  const [uniformity, setUniformity] = useState(100);
  const [isIngredientsAdded, setIsIngredientsAdded] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(RECIPES[0]);
  
  // 예약 및 안전 설정
  const [isReservationMode, setIsReservationMode] = useState(false);
  const [targetTime, setTargetTime] = useState("08:00");
  const [startTime, setStartTime] = useState<string | null>(null);
  const [autoOffCounter, setAutoOffCounter] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 예약 시작 시간 계산 (목표 시각 - 조리시간 - 예열3분)
  const calculateStartTime = useCallback((targetStr: string, cookSec: number) => {
    const [hours, minutes] = targetStr.split(':').map(Number);
    const targetDate = new Date();
    targetDate.setHours(hours, minutes, 0, 0);
    
    if (targetDate.getTime() < Date.now()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const preheatBuffer = 180; 
    const startTimestamp = targetDate.getTime() - (cookSec + preheatBuffer) * 1000;
    const startDate = new Date(startTimestamp);
    
    return startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }, []);

  const simulateStep = useCallback(() => {
    // 1. 예약 모드 체크
    if (state === CookingState.RESERVED) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      if (now === startTime) {
        setIsRunning(true);
        setState(CookingState.HEATING_WATER);
        setPower(selectedRecipe.isEnvelopingRequired ? 6 : 10);
      }
      return; 
    }

    // 2. 현재 센서 값 가져오기
    const lastData = history[history.length - 1] || {
      time: 0,
      legacyTemp: 22,
      groundTruthTemp: 22,
      vibration: 2,
      soundFrequency: 50,
      powerLevel: 0,
      heatUniformity: 100
    };

    let nextGroundTruth = lastData.groundTruthTemp;
    let nextLegacy = lastData.legacyTemp;
    let nextVibration = lastData.vibration;
    let nextUniformity = lastData.heatUniformity;
    let nextPower = power;
    let nextState = state;
    let nextRemainingTime = remainingTime;

    // 3. 온도 제어 로직
    if (isRunning) {
      const target = selectedRecipe.targetTemp;
      if (nextGroundTruth >= target + 0.3) {
        nextPower = 0;
        nextGroundTruth -= 0.08; 
      } else if (nextGroundTruth >= target - 1.5) {
        nextPower = 1; // 유지 화력
        nextGroundTruth += (target - nextGroundTruth) * 0.15 + (Math.random() - 0.5) * 0.05;
      } else {
        nextPower = selectedRecipe.isEnvelopingRequired ? 6 : 10;
        const gap = target - nextGroundTruth;
        nextGroundTruth += Math.max(0.2, (nextPower / 10) * (gap / 10)); // 가열 속도 향상
      }
      
      nextLegacy += (nextGroundTruth - nextLegacy) * 0.05;
      nextUniformity = selectedRecipe.isEnvelopingRequired ? Math.min(100, nextUniformity + 0.3) : Math.max(45, nextUniformity - 0.1);
    } else {
      nextGroundTruth -= 0.2;
      nextLegacy -= 0.15;
      nextPower = 0;
    }

    // 4. 상태 머신 및 타이머 조절
    if (state === CookingState.HEATING_WATER) {
      if (nextGroundTruth >= selectedRecipe.targetTemp - 0.5) {
        if (selectedRecipe.id === 'water') {
          nextState = CookingState.COMPLETE;
          setIsRunning(false);
        } else if (selectedRecipe.autoStartCook || isReservationMode) {
          nextState = CookingState.COOKING_INGR_ACTIVE;
        } else {
          nextState = CookingState.WAITING_FOR_INGREDIENTS;
        }
      }
    } else if (state === CookingState.COOKING_INGR_ACTIVE) {
      // 실제 조리 중일 때만 시간 차감 (200ms 주기에 맞게 0.2초 차감)
      nextRemainingTime = Math.max(0, remainingTime - 0.2);
      
      if (nextRemainingTime <= 0) {
        nextState = CookingState.COMPLETE;
        setIsRunning(false);
      }
      
      // 넘침 감지 시뮬레이션
      if (nextGroundTruth > selectedRecipe.targetTemp - 2 && Math.random() > 0.98 && !selectedRecipe.isEnvelopingRequired) {
        nextState = CookingState.PREDICTING_BOILOVER;
      }
    } else if (state === CookingState.PREDICTING_BOILOVER) {
      nextRemainingTime = Math.max(0, remainingTime - 0.2);
      nextPower = 1;
      if (Math.random() > 0.9) nextState = CookingState.COOKING_INGR_ACTIVE;
    } else if (state === CookingState.COMPLETE) {
      // 조리 완료 후 안전 자동 종료 카운터
      setAutoOffCounter(prev => {
        if (prev >= 50) { // 약 10초 무응답 시 종료
          setState(CookingState.IDLE);
          setIsRunning(false);
          setPower(0);
          return 0;
        }
        return prev + 1;
      });
    }

    // 5. 모든 상태 일괄 업데이트
    setState(nextState);
    setRemainingTime(nextRemainingTime);
    setPower(isRunning ? nextPower : 0);
    setUniformity(nextUniformity);

    setHistory(prev => [...prev, {
      time: lastData.time + 1,
      legacyTemp: Math.max(22, nextLegacy),
      groundTruthTemp: Math.max(22, nextGroundTruth),
      vibration: Math.max(2, isRunning ? 5 + Math.random() * 5 : 2),
      soundFrequency: 100 + nextGroundTruth,
      powerLevel: isRunning ? nextPower : 0,
      heatUniformity: nextUniformity
    }].slice(-60));

  }, [state, power, remainingTime, isRunning, selectedRecipe, startTime, isReservationMode, history]);

  useEffect(() => {
    if (isRunning || state === CookingState.RESERVED) {
      timerRef.current = setInterval(simulateStep, 200);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, state, simulateStep]);

  const handleStart = () => {
    if (isReservationMode) {
      const calculated = calculateStartTime(targetTime, selectedRecipe.cookTime);
      setStartTime(calculated);
      setState(CookingState.RESERVED);
      setIsRunning(false);
    } else {
      setIsRunning(true);
      setPower(selectedRecipe.isEnvelopingRequired ? 6 : 10);
      setState(CookingState.HEATING_WATER);
      setRemainingTime(selectedRecipe.cookTime);
      setIsIngredientsAdded(selectedRecipe.autoStartCook || false);
    }
    setHistory([]);
    setAutoOffCounter(0);
  };

  const currentTemp = history[history.length - 1]?.groundTruthTemp || 22;

  const renderContent = () => {
    switch (activeTab) {
      case 'System Arch':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="glass rounded-[2rem] p-8 border border-white/5 space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-3"><Layers className="text-blue-500" /> Multi-modal Sensor Fusion</h3>
              <div className="space-y-4 text-slate-400 text-sm">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="font-bold text-slate-200 mb-1">Reservation AI Logic</p>
                  <p>사용자가 설정한 시각에 조리가 완료되도록 조리 시간을 역산하여 자동 작동합니다.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="font-bold text-slate-200 mb-1">Safety Auto-Shutdown</p>
                  <p>조리 완료 후 사용자의 피드백이 없을 경우 화재 방지를 위해 전원을 자동 차단합니다.</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-[2rem] p-8 border border-white/5 flex flex-col items-center justify-center text-center">
              <div className="w-48 h-48 rounded-full border-4 border-dashed border-blue-500/20 animate-spin-slow flex items-center justify-center relative">
                <Database className="w-16 h-16 text-blue-500" />
                <div className="absolute inset-0 bg-blue-500/5 rounded-full animate-pulse" />
              </div>
              <h4 className="mt-8 text-lg font-bold">AI Core Logic v2.9</h4>
              <p className="text-sm text-slate-500 mt-2">Reservation & Safety Protocols Active</p>
            </div>
          </div>
        );

      case 'Analytics':
        return (
          <div className="space-y-6 animate-in fade-in">
            <div className="glass rounded-[2rem] p-8 border border-white/5">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><BarChart2 className="text-blue-500" /> 조리 데이터 실시간 모니터링</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="colorGT" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" hide />
                    <YAxis stroke="#475569" fontSize={10} />
                    <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px'}} />
                    <Area type="monotone" dataKey="groundTruthTemp" stroke="#3b82f6" fillOpacity={1} fill="url(#colorGT)" strokeWidth={3} name="실제 온도 (°C)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard label="평균 온도 정확도" value="99.8%" description="GT 센서 오차 범위 0.1°C" icon={<Zap />} />
              <MetricCard label="안전 가동율" value="100%" description="자동 차단 시스템 정상 작동" icon={<ShieldCheck />} />
              <MetricCard label="예약 정확도" value="±0s" description="타겟 시각 정밀 도달" icon={<Clock />} />
            </div>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
            <div className="lg:col-span-8 space-y-6 relative">
              
              {/* 조리 완료 알람 */}
              {state === CookingState.COMPLETE && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl rounded-[2.5rem] border-4 border-emerald-500/50 animate-in zoom-in duration-500">
                   <div className="text-center p-12 bg-emerald-600 rounded-[3rem] shadow-[0_0_100px_rgba(16,185,129,0.6)] text-white relative overflow-hidden max-w-md w-full">
                      <div className="relative z-10 flex flex-col items-center gap-6">
                        <div className="p-6 bg-white text-emerald-600 rounded-full animate-bounce shadow-2xl">
                           <Bell className="w-16 h-16" />
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-4xl font-black tracking-tight uppercase">Ready!</h2>
                          <p className="text-emerald-50 font-medium opacity-90">{selectedRecipe.name} 조리 완료</p>
                          <p className="text-[10px] text-emerald-200 mt-2">미응답 시 화재 방지를 위해 자동 전원 차단</p>
                        </div>
                        <button 
                          onClick={() => {setState(CookingState.IDLE); setHistory([]); setRemainingTime(0);}}
                          className="w-full py-5 bg-white text-emerald-700 rounded-2xl font-black text-xl hover:bg-slate-100 transition-all active:scale-95 shadow-xl"
                        >
                          조리 확인 (전원 끄기)
                        </button>
                      </div>
                   </div>
                </div>
              )}

              {/* 레시피 선택기 */}
              <div className="glass rounded-3xl p-4 border border-white/5 overflow-x-auto no-scrollbar">
                <div className="flex gap-4 min-w-max px-2">
                  {RECIPES.map((recipe) => (
                    <button
                      key={recipe.id}
                      disabled={isRunning || state === CookingState.RESERVED}
                      onClick={() => {
                        setSelectedRecipe(recipe);
                        setRemainingTime(recipe.cookTime);
                        setIsReservationMode(false);
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border ${
                        selectedRecipe.id === recipe.id 
                          ? (recipe.isEnvelopingRequired ? 'bg-orange-600/20 border-orange-500/50 text-white' : 'bg-blue-600/20 border-blue-500/50 text-white')
                          : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                      } ${(isRunning || state === CookingState.RESERVED) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-2xl">{recipe.icon}</span>
                      <span className="text-xs font-bold whitespace-nowrap">{recipe.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 메인 비주얼라이저 카드 */}
              <div className="glass rounded-[2rem] p-6 lg:p-8 border border-white/5 relative overflow-hidden h-[500px]">
                <div className="absolute top-6 left-8 z-10 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl shadow-lg ${selectedRecipe.isEnvelopingRequired ? 'bg-orange-600 shadow-orange-900/20' : 'bg-blue-600 shadow-blue-900/20'}`}>
                      {isReservationMode ? <CalendarDays className="w-5 h-5 text-white" /> : (selectedRecipe.isEnvelopingRequired ? <Flame className="w-5 h-5 text-white" /> : <Zap className="w-5 h-5 text-white" />)}
                    </div>
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {isReservationMode ? 'AI Scheduled Cooking' : (selectedRecipe.isEnvelopingRequired ? 'Enveloping Heat Mode' : 'Direct Logic')}
                      </h3>
                      <p className="text-xl font-bold tracking-tight">{selectedRecipe.name} {isReservationMode ? '예약 대기' : '자율 조리'}</p>
                    </div>
                  </div>

                  {/* 상태 바들 */}
                  <div className="flex flex-wrap items-center gap-4 mt-4">
                     <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                       <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Status</p>
                       <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${state === CookingState.IDLE ? 'bg-slate-600' : 'bg-emerald-500 animate-pulse'}`} />
                          <span className="text-sm font-semibold">{state.replace(/_/g, ' ')}</span>
                       </div>
                     </div>
                     
                     <div className="px-4 py-2 bg-orange-500/10 rounded-2xl border border-orange-500/20 backdrop-blur-md">
                        <p className="text-[10px] text-orange-400 uppercase font-bold mb-1">Live Temp</p>
                        <div className="flex items-center gap-2">
                           <Thermometer className="w-4 h-4 text-orange-400" />
                           <span className="text-sm font-black text-white tabular-nums">{currentTemp.toFixed(1)}°</span>
                           <span className="text-[10px] text-slate-500">/ {selectedRecipe.targetTemp}°</span>
                        </div>
                     </div>

                     <div className="px-4 py-2 bg-blue-600/10 rounded-2xl border border-blue-500/20 backdrop-blur-md min-w-[130px]">
                        <p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Cook Progress</p>
                        <div className="flex items-center gap-2">
                           <Timer className="w-4 h-4 text-blue-400" />
                           <span className="text-sm font-black text-white tabular-nums">
                             {state === CookingState.RESERVED ? (
                               <span className="text-blue-400 animate-pulse">{startTime} 시작 예정</span>
                             ) : state === CookingState.HEATING_WATER ? (
                               <span className="text-orange-400 animate-pulse">예열 중...</span>
                             ) : (
                               `${Math.floor(remainingTime / 60)}:${Math.floor(remainingTime % 60).toString().padStart(2, '0')}`
                             )}
                           </span>
                        </div>
                     </div>
                  </div>
                </div>

                <Visualizer 
                  state={state} 
                  temp={currentTemp}
                  power={power}
                  isEnvelopingMode={selectedRecipe.isEnvelopingRequired}
                />

                <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row justify-between items-center gap-4">
                  {/* 예약 설정 패널 */}
                  {state === CookingState.IDLE && selectedRecipe.canReserve && (
                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl w-full md:w-auto">
                       <button 
                         onClick={() => setIsReservationMode(!isReservationMode)}
                         className={`px-4 py-3 rounded-xl font-bold text-xs transition-all ${isReservationMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
                       >
                         {isReservationMode ? '예약 끄기' : '완료 시각 예약'}
                       </button>
                       {isReservationMode && (
                         <div className="flex items-center gap-2 pr-3">
                           <Clock className="w-4 h-4 text-blue-400" />
                           <input 
                             type="time" 
                             value={targetTime}
                             onChange={(e) => setTargetTime(e.target.value)}
                             className="bg-transparent text-white font-black text-xl outline-none border-b border-blue-500 px-2 cursor-pointer"
                           />
                           <span className="text-[10px] text-slate-500 font-bold">완료</span>
                         </div>
                       )}
                    </div>
                  )}

                  <div className="flex gap-3 w-full md:w-auto ml-auto">
                    {state === CookingState.IDLE && (
                      <button onClick={handleStart} className={`w-full md:w-auto px-10 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-2xl transition-all hover:-translate-y-1 ${
                        isReservationMode ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20' : 
                        (selectedRecipe.isEnvelopingRequired ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20')
                      }`}>
                        {isReservationMode ? <CalendarDays className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />} 
                        {isReservationMode ? '예약 확정' : '즉시 조리 시작'}
                      </button>
                    )}
                    {(isRunning || state === CookingState.RESERVED) && (
                      <button onClick={() => {setIsRunning(false); setState(CookingState.IDLE); setPower(0); setRemainingTime(0);}} className="p-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-2xl border border-red-500/20 transition-all">
                        <Square className="w-5 h-5 fill-current" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 하단 정보 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass rounded-3xl p-6 border border-white/5">
                  <h4 className="text-xs font-bold mb-4 flex items-center gap-2 text-slate-400 uppercase tracking-widest">
                    <Timer className="w-4 h-4 text-blue-400" /> AI Scheduling Insight
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">타겟 완료 시각</span>
                      <span className="font-bold text-white">{isReservationMode ? targetTime : "즉시 실행"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">총 조리 예상</span>
                      <span className="font-bold text-white">{Math.floor(selectedRecipe.cookTime / 60)}분 (예열 제외)</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: isRunning ? '100%' : '0%' }} />
                    </div>
                  </div>
                </div>
                <div className="glass rounded-3xl p-6 border border-white/5">
                  <h4 className="text-xs font-bold mb-4 flex items-center gap-2 text-slate-400 uppercase tracking-widest">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Safety Protocol Status
                  </h4>
                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                    <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">Auto-Off Ready</p>
                    <p className="text-xs text-slate-300">
                      조리 완료 후 사용자의 움직임이 감지되지 않으면 에너지를 자동 차단합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="glass rounded-3xl p-6 border border-white/5">
                 <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-widest text-slate-400">
                   <Clock className="w-5 h-5 text-blue-500" /> 조리 타임라인
                 </h3>
                 <div className="space-y-6 relative">
                    <div className="absolute left-4 top-2 bottom-2 w-[1px] bg-white/5" />
                    <StepItem done={state !== CookingState.IDLE && state !== CookingState.RESERVED} active={state === CookingState.RESERVED} label={`예약 대기 (${startTime || '--:--'})`} />
                    <StepItem done={state !== CookingState.IDLE && state !== CookingState.RESERVED && state !== CookingState.HEATING_WATER} active={state === CookingState.HEATING_WATER} label="가열 및 예열 중" />
                    <StepItem done={state === CookingState.COMPLETE} active={state === CookingState.COOKING_INGR_ACTIVE || state === CookingState.PREDICTING_BOILOVER} label="AI 자율 조리 (타이머 작동)" />
                    <StepItem done={false} active={state === CookingState.COMPLETE} label="조리 완료 및 확인 대기" />
                 </div>
              </div>

              <div className="glass rounded-3xl p-6 border border-white/5">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">조리 데이터 시트</h3>
                    <Database className="w-4 h-4 text-blue-500" />
                 </div>
                 <div className="space-y-4">
                    <MetricCard label="Target Temp" value={`${selectedRecipe.targetTemp}°C`} description="최적 조리 온도" icon={<Thermometer />} />
                    <MetricCard label="Power Level" value={`Level ${power}`} description="실시간 가변 화력" improvement icon={<Zap />} />
                 </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0c] text-slate-100">
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

const StepItem: React.FC<{ done: boolean, active: boolean, label: string }> = ({ done, active, label }) => (
  <div className={`relative flex items-center gap-6 pl-2 transition-all duration-500 ${active ? 'opacity-100 translate-x-1' : 'opacity-30'}`}>
    <div className={`w-4 h-4 rounded-full z-10 transition-colors ${done ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : active ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`} />
    <span className={`text-xs font-bold tracking-tight ${active ? 'text-white' : 'text-slate-400'}`}>{label}</span>
  </div>
);

export default App;
