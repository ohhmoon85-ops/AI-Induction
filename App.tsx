
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
  Info
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
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const simulateStep = useCallback(() => {
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

      // --- [정밀 온도 제어 알고리즘 - 오버슈트 방지] ---
      if (isRunning) {
        if (nextGroundTruth >= target + 0.5) {
          // 목표 온도 초과 시: 가열 즉각 중단 및 자연 냉각
          currentPower = 0;
          nextGroundTruth -= 0.05; 
        } else if (nextGroundTruth >= target - 2) {
          // 목표 온도 근접 시: 미세 화력 유지 (Level 1-2)
          currentPower = 1;
          const correction = (target - nextGroundTruth) * 0.1;
          nextGroundTruth += correction + (Math.random() - 0.5) * 0.05;
        } else {
          // 목표 온도 도달 전: 설정된 화력으로 가열
          const gap = target - nextGroundTruth;
          const heatGain = (currentPower / 10) * Math.min(1.2, gap / 15);
          nextGroundTruth += Math.max(0.1, heatGain);
        }
        
        // 레거시 센서는 열지연 현상 반영 (느리게 따라옴)
        nextLegacy += (nextGroundTruth - nextLegacy) * 0.04 + (Math.random() - 0.5) * 0.1;

        if (selectedRecipe.isEnvelopingRequired) {
          nextUniformity = Math.min(100, nextUniformity + 0.2);
        } else {
          nextUniformity = Math.max(45, nextUniformity - 0.05);
        }
      } else {
        // 정지 상태: 냉각
        nextGroundTruth -= 0.15;
        nextLegacy -= 0.1;
        nextUniformity = Math.min(100, nextUniformity + 0.1);
        currentPower = 0;
      }

      let nextState = state;
      
      // --- [상태 머신 및 타이머 로직] ---
      if (state === CookingState.HEATING_WATER) {
        nextRemainingTime = selectedRecipe.cookTime;
        if (nextGroundTruth >= target - 0.5) {
          if (selectedRecipe.id === 'water') {
            nextState = CookingState.COMPLETE;
            setIsRunning(false);
          } else if (selectedRecipe.autoStartCook) {
            nextState = CookingState.COOKING_INGR_ACTIVE;
          } else {
            nextState = CookingState.WAITING_FOR_INGREDIENTS;
          }
        }
      } else if (state === CookingState.WAITING_FOR_INGREDIENTS) {
        nextRemainingTime = selectedRecipe.cookTime; // 재료 넣기 전까지 타이머 고정
      } else if (state === CookingState.COOKING_INGR_ACTIVE) {
        // 실제 조리 시작: 카운트다운 가동
        nextRemainingTime = Math.max(0, nextRemainingTime - 0.5);
        
        const frothFactor = selectedRecipe.id === 'ramen' ? 5 : 1.5;
        if (nextGroundTruth > target - 3) {
          nextVibration = 8 + (Math.random() * 12 * frothFactor);
        }

        if (nextVibration > 45 && !selectedRecipe.isEnvelopingRequired) {
          nextState = CookingState.PREDICTING_BOILOVER;
          currentPower = 1; 
        } else if (nextRemainingTime <= 0) {
          nextState = CookingState.COMPLETE;
          setIsRunning(false);
        }
      } else if (state === CookingState.PREDICTING_BOILOVER) {
        nextRemainingTime = Math.max(0, nextRemainingTime - 0.5);
        nextVibration *= 0.7;
        if (nextVibration < 12) nextState = CookingState.COOKING_INGR_ACTIVE;
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
  }, [state, power, remainingTime, isRunning, selectedRecipe]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(simulateStep, 200);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, simulateStep]);

  const startCooking = () => {
    setIsRunning(true);
    setPower(selectedRecipe.isEnvelopingRequired ? 6 : 10);
    setState(CookingState.HEATING_WATER);
    setRemainingTime(selectedRecipe.cookTime);
    setIsIngredientsAdded(selectedRecipe.autoStartCook || false);
    setHistory([]);
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
                  <p className="font-bold text-slate-200 mb-1">IR Thermal Ground Truth</p>
                  <p>비접촉 적외선 센서를 통해 용기 하단의 실제 온도를 0.1도 단위로 정밀 계측하여 오버슈트를 원천 차단합니다.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="font-bold text-slate-200 mb-1">Acoustic Vibration Analysis</p>
                  <p>끓음 전조 현상에서 발생하는 고유 진동 주파수를 분석하여 넘침을 사전 예측하고 화력을 조절합니다.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="font-bold text-slate-200 mb-1">Enveloping Induction Core</p>
                  <p>측면 자기장 유도 코일을 통해 가스레인지와 같은 입체 가열 효과를 구현하여 열 균일도를 높입니다.</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-[2rem] p-8 border border-white/5 flex flex-col items-center justify-center text-center">
              <div className="w-48 h-48 rounded-full border-4 border-dashed border-blue-500/20 animate-spin-slow flex items-center justify-center relative">
                <Database className="w-16 h-16 text-blue-500" />
                <div className="absolute inset-0 bg-blue-500/5 rounded-full animate-pulse" />
              </div>
              <h4 className="mt-8 text-lg font-bold">AI Core Logic v2.5</h4>
              <p className="text-sm text-slate-500 mt-2 whitespace-pre-line">Patent No. 10-2708883{'\n'}Autonomous Heat Modulation Active</p>
            </div>
          </div>
        );

      case 'Analytics':
        return (
          <div className="space-y-6 animate-in fade-in">
            <div className="glass rounded-[2rem] p-8 border border-white/5">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><BarChart2 className="text-blue-500" /> 조리 데이터 실시간 분석</h3>
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
                    <Area type="monotone" dataKey="heatUniformity" stroke="#10b981" fillOpacity={0} strokeWidth={2} name="열 균일도 (%)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard label="에너지 효율" value="94.2%" description="유도 가열 손실율 최소화" improvement icon={<Zap />} />
              <MetricCard label="평균 균일도" value={`${uniformity.toFixed(1)}%`} description="용기 전체 열분포 지수" icon={<Waves />} />
              <MetricCard label="조리 안정성" value="Excellent" description="AI 오버슈트 방지 알고리즘" icon={<ShieldCheck />} />
            </div>
          </div>
        );

      case 'Cooking Logs':
        return (
          <div className="glass rounded-[2rem] p-8 border border-white/5 animate-in fade-in">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><Clock className="text-blue-500" /> 최근 조리 히스토리</h3>
            <div className="space-y-4">
              {[
                { time: '14:20', recipe: '라면', duration: '4:00', status: 'Success', temp: '100°C' },
                { time: '12:05', recipe: '김치찌개', duration: '15:00', status: 'Success', temp: '98.5°C' },
                { time: '08:30', recipe: '물끓이기', duration: '1:05', status: 'Auto-Stop', temp: '100.1°C' },
                { time: '어제', recipe: '생선튀김', duration: '8:00', status: 'Success', temp: '180.2°C' },
              ].map((log, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 font-bold group-hover:scale-110 transition-transform">{log.time}</div>
                    <div>
                      <p className="font-bold">{log.recipe}</p>
                      <p className="text-xs text-slate-500">{log.duration} 소요 • 최종 {log.temp}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> {log.status}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Ground Truth':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
             <div className="glass rounded-[2rem] p-8 border border-white/5">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><Database className="text-orange-500" /> 센서 퓨전 상세 상태</h3>
                <div className="space-y-8 mt-10">
                   <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-400">IR Thermal Sensor (GT)</span>
                        <span className="text-sm font-black text-orange-400">{currentTemp.toFixed(1)}°C</span>
                      </div>
                      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${Math.min(100, (currentTemp / selectedRecipe.targetTemp) * 100)}%` }} />
                      </div>
                   </div>
                   <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-400">Acoustic Vibration (Hz)</span>
                        <span className="text-sm font-black text-blue-400">{(history[history.length-1]?.vibration || 0).toFixed(1)} Hz</span>
                      </div>
                      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.min(100, (history[history.length-1]?.vibration || 0) * 2)}%` }} />
                      </div>
                   </div>
                   <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                      <p className="text-xs text-blue-300 leading-relaxed font-medium">
                        * Ground Truth 온도는 용기 내부의 실제 온도를 계측하며, 외부 센서(Legacy)의 열지연 한계를 극복합니다.
                      </p>
                   </div>
                </div>
             </div>
             <div className="glass rounded-[2rem] p-8 border border-white/5 flex flex-col justify-center text-center space-y-6">
                <div className="p-10 bg-orange-500/5 rounded-[2.5rem] border border-orange-500/10 relative overflow-hidden">
                   <Thermometer className="w-16 h-16 text-orange-500 mx-auto mb-6 animate-pulse" />
                   <h4 className="text-2xl font-black text-orange-200">Anti-Overshoot Active</h4>
                   <p className="text-sm text-slate-400 mt-4 leading-relaxed">
                     목표 온도 도달 시 화력을 10% 미만으로{'\n'}즉각 조절하여 에너지 낭비와 오버슈트를 차단합니다.
                   </p>
                </div>
             </div>
          </div>
        );

      case 'Safety Protocols':
        return (
          <div className="glass rounded-[2rem] p-8 border border-white/5 animate-in fade-in">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><ShieldAlert className="text-red-500" /> 안전 프로토콜 가동 현황</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <div className="flex items-center gap-5 p-5 bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
                     <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500"><ShieldCheck /></div>
                     <div>
                        <p className="font-bold">과열 방지 (Overheat)</p>
                        <p className="text-xs text-slate-500">임계 온도 초과 시 0.1초 내 전원 차단</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-5 p-5 bg-blue-500/5 rounded-3xl border border-blue-500/10">
                     <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-500"><Waves /></div>
                     <div>
                        <p className="font-bold">넘침 방지 (Boil-over)</p>
                        <p className="text-xs text-slate-500">진동 피크 감지 시 화력 즉각 2단계 하향</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-5 p-5 bg-orange-500/5 rounded-3xl border border-orange-500/10">
                     <div className="p-3 bg-orange-500/20 rounded-2xl text-orange-500"><Flame /></div>
                     <div>
                        <p className="font-bold">화재 감지 (IR Fusion)</p>
                        <p className="text-xs text-slate-500">비정상 열 패턴 감지 시 경보 작동</p>
                     </div>
                  </div>
               </div>
               <div className="p-10 bg-red-500/5 rounded-[3rem] border border-red-500/10 flex flex-col items-center justify-center text-center">
                  <div className="p-6 bg-red-500/20 rounded-full mb-6">
                    <Flame className="w-12 h-12 text-red-500" />
                  </div>
                  <p className="text-sm font-black text-red-200 uppercase tracking-widest mb-2">Emergency System</p>
                  <p className="text-xs text-slate-500 mb-8 leading-relaxed">긴급 상황 발생 시 모든 전력을 차단하고{'\n'}관리자 앱으로 즉시 알림을 발송합니다.</p>
                  <button className="w-full py-5 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-xl shadow-red-900/20 uppercase tracking-tighter">Emergency Stop</button>
               </div>
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="relative z-10 flex flex-col items-center gap-8">
                        <div className="relative">
                          <div className="absolute inset-0 bg-white/20 rounded-full animate-ping scale-150" />
                          <div className="p-8 bg-white text-emerald-600 rounded-full animate-bounce shadow-2xl">
                             <Bell className="w-16 h-16 fill-current" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-4xl font-black tracking-tight uppercase">Cooking Done!</h2>
                          <p className="text-emerald-50 font-medium text-lg opacity-90">{selectedRecipe.name} 준비가 되었습니다.</p>
                        </div>
                        <button 
                          onClick={() => {setState(CookingState.IDLE); setHistory([]); setRemainingTime(0);}}
                          className="w-full py-5 bg-white text-emerald-700 rounded-2xl font-black text-xl hover:bg-slate-100 transition-all active:scale-95 shadow-xl"
                        >
                          알람 끄기 & 확인
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
                      disabled={isRunning}
                      onClick={() => {
                        setSelectedRecipe(recipe);
                        setRemainingTime(recipe.cookTime);
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border ${
                        selectedRecipe.id === recipe.id 
                          ? (recipe.isEnvelopingRequired ? 'bg-orange-600/20 border-orange-500/50 text-white' : 'bg-blue-600/20 border-blue-500/50 text-white')
                          : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                      } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-2xl">{recipe.icon}</span>
                      <span className="text-xs font-bold whitespace-nowrap">{recipe.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass rounded-[2rem] p-6 lg:p-8 border border-white/5 relative overflow-hidden h-[480px]">
                <div className="absolute top-6 left-8 z-10 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl shadow-lg ${selectedRecipe.isEnvelopingRequired ? 'bg-orange-600 shadow-orange-900/20' : 'bg-blue-600 shadow-blue-900/20'}`}>
                      {selectedRecipe.isEnvelopingRequired ? <Flame className="w-5 h-5 text-white" /> : <Zap className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {selectedRecipe.isEnvelopingRequired ? 'Enveloping Heat Mode' : 'Direct Logic'}
                      </h3>
                      <p className="text-xl font-bold tracking-tight">{selectedRecipe.name} 자동조리</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-4">
                     <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                       <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Status</p>
                       <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${state === CookingState.IDLE ? 'bg-slate-600' : 'bg-emerald-500 animate-pulse'}`} />
                          <span className="text-sm font-semibold whitespace-nowrap">{state.replace(/_/g, ' ')}</span>
                       </div>
                     </div>
                     
                     <div className="px-4 py-2 bg-orange-500/10 rounded-2xl border border-orange-500/20 backdrop-blur-md">
                        <p className="text-[10px] text-orange-400 uppercase font-bold mb-1">Live Temp</p>
                        <div className="flex items-center gap-2">
                           <Thermometer className="w-4 h-4 text-orange-400" />
                           <span className="text-sm font-black text-white tabular-nums">{currentTemp.toFixed(1)}°</span>
                           <span className="text-[10px] text-slate-500">/ Goal {selectedRecipe.targetTemp}°</span>
                        </div>
                     </div>

                     <div className="px-4 py-2 bg-blue-600/10 rounded-2xl border border-blue-500/20 backdrop-blur-md min-w-[120px]">
                        <p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Cook Time Left</p>
                        <div className="flex items-center gap-2">
                           <Timer className="w-4 h-4 text-blue-400" />
                           <span className="text-sm font-black tabular-nums tracking-tighter text-blue-100">
                             {isRunning ? (
                               (state === CookingState.HEATING_WATER || state === CookingState.WAITING_FOR_INGREDIENTS) ? (
                                 <span className="text-[10px] text-blue-400/70 animate-pulse">예열 대기 중...</span>
                               ) : (
                                 `${Math.floor(remainingTime / 60)}:${(remainingTime % 60).toFixed(0).padStart(2, '0')}`
                               )
                             ) : (
                               `${Math.floor(selectedRecipe.cookTime / 60)}:00`
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
                  <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 w-full md:w-auto">
                    <ShieldCheck className={`w-6 h-6 ${state === CookingState.PREDICTING_BOILOVER ? 'text-orange-500 animate-bounce' : 'text-emerald-500'}`} />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI Intelligent Monitor</p>
                      <p className="text-xs font-medium text-slate-200">
                        {state === CookingState.HEATING_WATER ? '목표 온도까지 가열 중' : 
                         state === CookingState.WAITING_FOR_INGREDIENTS ? '재료를 넣어주세요' :
                         state === CookingState.PREDICTING_BOILOVER ? '넘침 방지 알고리즘 작동 중' : '최적의 화력 균일도 유지 중'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto">
                    {state === CookingState.IDLE && (
                      <button onClick={startCooking} className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-2xl transition-all hover:-translate-y-1 ${
                        selectedRecipe.isEnvelopingRequired ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                      }`}>
                        <Play className="w-5 h-5 fill-current" /> 자율 조리 시작
                      </button>
                    )}
                    {state === CookingState.WAITING_FOR_INGREDIENTS && (
                      <button onClick={() => { setIsIngredientsAdded(true); setState(CookingState.COOKING_INGR_ACTIVE); setPower(8); }} className="w-full md:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black flex items-center justify-center gap-2 shadow-2xl shadow-emerald-600/20 animate-bounce transition-all">
                        <UtensilsCrossed className="w-5 h-5" /> 재료 투입 완료 (카운트다운 시작)
                      </button>
                    )}
                    {isRunning && (
                      <button onClick={() => {setIsRunning(false); setState(CookingState.IDLE); setPower(0);}} className="p-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-2xl border border-red-500/20 transition-all">
                        <Square className="w-5 h-5 fill-current" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass rounded-3xl p-6 border border-white/5">
                  <h4 className="text-xs font-bold mb-4 flex items-center gap-2 text-slate-400 uppercase tracking-widest">
                    <Timer className="w-4 h-4 text-blue-400" /> Countdown Status
                  </h4>
                  <div className="h-40 flex flex-col items-center justify-center gap-2">
                     <p className="text-5xl font-black tabular-nums tracking-tighter text-blue-400">
                       {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toFixed(0).padStart(2, '0')}
                     </p>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                       {state === CookingState.HEATING_WATER || state === CookingState.WAITING_FOR_INGREDIENTS 
                         ? "Paused until Ingredients Added" 
                         : "Active Countdown"}
                     </p>
                  </div>
                </div>
                <div className="glass rounded-3xl p-6 border border-white/5">
                  <h4 className="text-xs font-bold mb-4 flex items-center gap-2 text-slate-400 uppercase tracking-widest">
                    <Thermometer className="w-4 h-4 text-orange-400" /> Temperature Progress
                  </h4>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={[0, selectedRecipe.targetTemp + 20]} />
                        <Area type="monotone" dataKey="groundTruthTemp" stroke="#f97316" fill="url(#colorTemp)" strokeWidth={3} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
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
                    <StepItem done={state !== CookingState.IDLE && state !== CookingState.HEATING_WATER} active={state === CookingState.HEATING_WATER} label={`예열 (${selectedRecipe.targetTemp}°C 도달)`} />
                    {!selectedRecipe.autoStartCook && (
                      <StepItem done={isIngredientsAdded} active={state === CookingState.WAITING_FOR_INGREDIENTS} label="주재료 투입 대기" />
                    )}
                    <StepItem done={state === CookingState.COMPLETE} active={state === CookingState.COOKING_INGR_ACTIVE || state === CookingState.PREDICTING_BOILOVER} label="AI 자율 조리 (카운트다운)" />
                    <StepItem done={false} active={state === CookingState.COMPLETE} label="조리 완료 및 알람" />
                 </div>
              </div>

              <div className="glass rounded-3xl p-6 border border-white/5">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">레시피 데이터</h3>
                    <Database className="w-4 h-4 text-blue-500" />
                 </div>
                 <div className="space-y-4">
                    <div className={`p-4 rounded-2xl border ${selectedRecipe.isEnvelopingRequired ? 'bg-orange-500/5 border-orange-500/10' : 'bg-blue-500/5 border-blue-500/10'}`}>
                      <p className={`text-xs font-bold mb-1 ${selectedRecipe.isEnvelopingRequired ? 'text-orange-400' : 'text-blue-400'}`}>
                        {selectedRecipe.isEnvelopingRequired ? 'Enveloping Heat Enabled' : 'Direct Heat Mode'}
                      </p>
                      <p className="text-sm text-slate-300 leading-relaxed">{selectedRecipe.description}</p>
                    </div>
                    <MetricCard label="Target Temp" value={`${selectedRecipe.targetTemp}°C`} description="GT 목표 온도" icon={<Thermometer />} />
                    <MetricCard label="Cook Time" value={`${Math.floor(selectedRecipe.cookTime/60)}m`} description="재료 투입 후 소요시간" improvement icon={<Timer />} />
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
        <div className="flex-1 transition-all duration-300">
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
