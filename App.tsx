
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
  
  // 예약 관련 상태
  const [isReservationMode, setIsReservationMode] = useState(false);
  const [targetTime, setTargetTime] = useState("08:00");
  const [startTime, setStartTime] = useState<string | null>(null);
  const [autoOffCounter, setAutoOffCounter] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 시간 계산 유틸리티
  const calculateStartTime = useCallback((targetStr: string, cookSec: number) => {
    const [hours, minutes] = targetStr.split(':').map(Number);
    const targetDate = new Date();
    targetDate.setHours(hours, minutes, 0, 0);
    
    // 만약 설정 시간이 현재보다 전이라면 내일로 설정
    if (targetDate.getTime() < Date.now()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // 예열 시간(약 3분 = 180초) + 조리 시간만큼 역산
    const preheatBuffer = 180; 
    const startTimestamp = targetDate.getTime() - (cookSec + preheatBuffer) * 1000;
    const startDate = new Date(startTimestamp);
    
    return startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }, []);

  const simulateStep = useCallback(() => {
    // 1. 예약 대기 로직
    if (state === CookingState.RESERVED) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      if (now === startTime) {
        setIsRunning(true);
        setState(CookingState.HEATING_WATER);
        setPower(selectedRecipe.isEnvelopingRequired ? 6 : 10);
      }
      return; 
    }

    setHistory(prev => {
      const last = prev[prev.length - 1] || {
        time: 0,
        legacyTemp: 22,
        groundTruthTemp: 22,
        vibration: 2,
        soundFrequency: 50,
        powerLevel: 0,
        heatUniformity: 100
      };

      const newTime = last.time + 1;
      let currentPower = power;
      let nextGroundTruth = last.groundTruthTemp;
      let nextLegacy = last.legacyTemp;
      let nextVibration = last.vibration;
      let nextUniformity = last.heatUniformity;
      let nextRemainingTime = remainingTime;

      const target = selectedRecipe.targetTemp;

      // 2. 조리 완료 후 안전 차단 로직
      if (state === CookingState.COMPLETE) {
        setAutoOffCounter(prev => {
          const next = prev + 1;
          if (next > 100) { // 시뮬레이션 상 약 20초간 무응답 시 자동 종료
            setIsRunning(false);
            setState(CookingState.IDLE);
            setPower(0);
            return 0;
          }
          return next;
        });
      }

      // 3. 온도 및 화력 제어 (Anti-Overshoot)
      if (isRunning) {
        if (nextGroundTruth >= target + 0.3) {
          currentPower = 0;
          nextGroundTruth -= 0.05; 
        } else if (nextGroundTruth >= target - 1.5) {
          currentPower = 1;
          nextGroundTruth += (target - nextGroundTruth) * 0.12 + (Math.random() - 0.5) * 0.05;
        } else {
          const gap = target - nextGroundTruth;
          const heatGain = (currentPower / 10) * Math.min(1.2, gap / 12);
          nextGroundTruth += Math.max(0.12, heatGain);
        }
        
        nextLegacy += (nextGroundTruth - nextLegacy) * 0.04 + (Math.random() - 0.5) * 0.1;

        if (selectedRecipe.isEnvelopingRequired) {
          nextUniformity = Math.min(100, nextUniformity + 0.2);
        } else {
          nextUniformity = Math.max(45, nextUniformity - 0.05);
        }
      } else {
        nextGroundTruth -= 0.15;
        nextLegacy -= 0.1;
        nextUniformity = Math.min(100, nextUniformity + 0.1);
        currentPower = 0;
      }

      let nextState = state;
      
      // 4. 상태 머신
      if (state === CookingState.HEATING_WATER) {
        nextRemainingTime = selectedRecipe.cookTime;
        if (nextGroundTruth >= target - 0.5) {
          if (selectedRecipe.id === 'water') {
            nextState = CookingState.COMPLETE;
            setIsRunning(false);
          } else if (selectedRecipe.autoStartCook || isReservationMode) {
            // 예약 모드일 때는 재료가 이미 들어있다고 가정하고 바로 조리 진행
            nextState = CookingState.COOKING_INGR_ACTIVE;
          } else {
            nextState = CookingState.WAITING_FOR_INGREDIENTS;
          }
        }
      } else if (state === CookingState.COOKING_INGR_ACTIVE) {
        nextRemainingTime = Math.max(0, nextRemainingTime - 0.5);
        if (nextRemainingTime <= 0) {
          nextState = CookingState.COMPLETE;
          setIsRunning(false);
        }
      }

      setState(nextState);
      setPower(isRunning ? currentPower : 0);
      setUniformity(nextUniformity);
      setRemainingTime(nextRemainingTime);

      return [...prev, {
        time: newTime,
        legacyTemp: Math.max(22, nextLegacy),
        groundTruthTemp: Math.max(22, nextGroundTruth),
        vibration: Math.max(2, nextVibration),
        soundFrequency: 100 + nextGroundTruth,
        powerLevel: isRunning ? currentPower : 0,
        heatUniformity: nextUniformity
      }].slice(-60);
    });
  }, [state, power, remainingTime, isRunning, selectedRecipe, startTime, isReservationMode]);

  useEffect(() => {
    // 예약 상태이거나 실행 중일 때 타이머 작동
    if (isRunning || state === CookingState.RESERVED) {
      timerRef.current = setInterval(simulateStep, 200);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
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
                  <p>사용자가 설정한 시각에 조리가 완료되도록 레시피의 평균 조리 데이터를 분석하여 최적의 시작 시점을 결정합니다.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="font-bold text-slate-200 mb-1">Safety Auto-Shutdown</p>
                  <p>조리 완료 후 사용자의 피드백이 일정 시간(10분) 없을 경우, 화재 방지를 위해 시스템을 자동으로 동결합니다.</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-[2rem] p-8 border border-white/5 flex flex-col items-center justify-center text-center">
              <div className="w-48 h-48 rounded-full border-4 border-dashed border-blue-500/20 animate-spin-slow flex items-center justify-center relative">
                <Database className="w-16 h-16 text-blue-500" />
                <div className="absolute inset-0 bg-blue-500/5 rounded-full animate-pulse" />
              </div>
              <h4 className="mt-8 text-lg font-bold">AI Core Logic v2.8 (Reservation Patch)</h4>
              <p className="text-sm text-slate-500 mt-2">Patent No. 10-2708883{'\n'}Scheduled Autonomous Cooking Mode</p>
            </div>
          </div>
        );

      case 'Analytics':
        return (
          <div className="space-y-6 animate-in fade-in">
            <div className="glass rounded-[2rem] p-8 border border-white/5">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><BarChart2 className="text-blue-500" /> 조리 데이터 분석</h3>
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
              <MetricCard label="조리 정확도" value="99.2%" description="목표 온도 편차 0.2°C 내" improvement icon={<Zap />} />
              <MetricCard label="예약 성공률" value="100%" description="지연 조리 보상 기능 작동" icon={<Clock />} />
              <MetricCard label="안전 지수" value="Certified" description="자동 차단 프로토콜 활성" icon={<ShieldCheck />} />
            </div>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
            <div className="lg:col-span-8 space-y-6 relative">
              
              {/* 조리 완료 알람 & 자동 꺼짐 경고 */}
              {state === CookingState.COMPLETE && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl rounded-[2.5rem] border-4 border-emerald-500/50 animate-in zoom-in duration-500">
                   <div className="text-center p-12 bg-emerald-600 rounded-[3rem] shadow-[0_0_100px_rgba(16,185,129,0.6)] text-white relative overflow-hidden max-w-md w-full">
                      <div className="relative z-10 flex flex-col items-center gap-6">
                        <div className="p-6 bg-white text-emerald-600 rounded-full animate-bounce shadow-2xl">
                           <CheckCircle2 className="w-16 h-16" />
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-4xl font-black tracking-tight uppercase">Ready to Eat!</h2>
                          <p className="text-emerald-50 font-medium opacity-90">{selectedRecipe.name} 조리가 완료되었습니다.</p>
                          <div className="mt-4 px-4 py-2 bg-black/20 rounded-xl border border-white/10 flex items-center gap-3">
                            <ShieldAlert className="w-4 h-4 text-orange-400" />
                            <p className="text-[10px] text-orange-100 font-bold uppercase">무응답 시 화재 방지를 위해 자동 전원 차단 예정</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {setState(CookingState.IDLE); setHistory([]); setRemainingTime(0);}}
                          className="w-full py-5 bg-white text-emerald-700 rounded-2xl font-black text-xl hover:bg-slate-100 transition-all active:scale-95 shadow-xl"
                        >
                          확인
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

                     <div className="px-4 py-2 bg-blue-600/10 rounded-2xl border border-blue-500/20 backdrop-blur-md min-w-[120px]">
                        <p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Cook Progress</p>
                        <div className="flex items-center gap-2">
                           <Timer className="w-4 h-4 text-blue-400" />
                           <span className="text-sm font-black text-white tabular-nums">
                             {state === CookingState.RESERVED ? (
                               <span className="text-blue-400 animate-pulse">{startTime} 시작</span>
                             ) : (
                               `${Math.floor(remainingTime / 60)}:${(remainingTime % 60).toFixed(0).padStart(2, '0')}`
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
                         className={`px-4 py-3 rounded-xl font-bold text-xs transition-all ${isReservationMode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                       >
                         {isReservationMode ? '예약 모드 ON' : '예약 조리'}
                       </button>
                       {isReservationMode && (
                         <input 
                           type="time" 
                           value={targetTime}
                           onChange={(e) => setTargetTime(e.target.value)}
                           className="bg-transparent text-white font-black text-xl outline-none border-b border-blue-500 px-2 cursor-pointer"
                         />
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
                        {isReservationMode ? '예약 확정' : '자율 조리 시작'}
                      </button>
                    )}
                    {(isRunning || state === CookingState.RESERVED) && (
                      <button onClick={() => {setIsRunning(false); setState(CookingState.IDLE); setPower(0);}} className="p-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-2xl border border-red-500/20 transition-all">
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
                      <span className="text-slate-500">목표 완료 시각</span>
                      <span className="font-bold text-white">{isReservationMode ? targetTime : "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">예상 조리 시간</span>
                      <span className="font-bold text-white">{Math.floor(selectedRecipe.cookTime / 60)}분 00초</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: state === CookingState.RESERVED ? '30%' : (isRunning ? '70%' : '0%') }} />
                    </div>
                  </div>
                </div>
                <div className="glass rounded-3xl p-6 border border-white/5">
                  <h4 className="text-xs font-bold mb-4 flex items-center gap-2 text-slate-400 uppercase tracking-widest">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Safety Monitoring
                  </h4>
                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                    <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">Auto-Off Protocol</p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      조리 완료 후 10분 내 사용자 감지(조작)가 없으면 전원이 자동으로 차단됩니다.
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
                    <StepItem done={state !== CookingState.IDLE && state !== CookingState.RESERVED} active={state === CookingState.RESERVED} label={`예약 대기 (${startTime || '시각 미설정'})`} />
                    <StepItem done={state !== CookingState.IDLE && state !== CookingState.RESERVED && state !== CookingState.HEATING_WATER} active={state === CookingState.HEATING_WATER} label="예열 및 수온 가열" />
                    <StepItem done={state === CookingState.COMPLETE} active={state === CookingState.COOKING_INGR_ACTIVE} label="AI 자율 조리" />
                    <StepItem done={false} active={state === CookingState.COMPLETE} label="조리 완료 및 확인 대기" />
                 </div>
              </div>

              <div className="glass rounded-3xl p-6 border border-white/5">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">조리 가이드</h3>
                    <Database className="w-4 h-4 text-blue-500" />
                 </div>
                 <div className="space-y-4">
                    <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                      <p className="text-xs font-bold mb-1 text-slate-400 uppercase">Recipe Detail</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{selectedRecipe.description}</p>
                    </div>
                    {isReservationMode && (
                      <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5">
                        <p className="text-xs font-bold mb-1 text-blue-400 uppercase">Reservation Tips</p>
                        <p className="text-[10px] text-blue-300">재료를 미리 냄비에 넣고 물을 맞춘 상태에서 예약 확정을 눌러주세요.</p>
                      </div>
                    )}
                    <MetricCard label="Target Temp" value={`${selectedRecipe.targetTemp}°C`} description="GT 목표 온도" icon={<Thermometer />} />
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
    <div className={`w-4 h-4 rounded-full z-10 transition-colors ${done ? 'bg-blue-500' : active ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`} />
    <span className={`text-xs font-bold tracking-tight ${active ? 'text-white' : 'text-slate-400'}`}>{label}</span>
  </div>
);

export default App;
