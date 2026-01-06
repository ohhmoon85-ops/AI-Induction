
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, 
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
  ShieldAlert
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
import { SensorData, CookingState, RAMEN_RECIPE } from './types';

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
  const [isIngredientsAdded, setIsIngredientsAdded] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const simulateStep = useCallback(() => {
    setHistory(prev => {
      const last = prev[prev.length - 1] || {
        time: 0,
        legacyTemp: 22,
        groundTruthTemp: 22,
        vibration: 2,
        soundFrequency: 50,
        powerLevel: 0
      };

      const newTime = last.time + 1;
      let currentPower = power;
      let nextGroundTruth = last.groundTruthTemp;
      let nextLegacy = last.legacyTemp;
      let nextVibration = last.vibration;

      if (currentPower > 0) {
        const heatGain = (currentPower / 12) * (1.2 - nextGroundTruth / 150);
        nextGroundTruth += heatGain;
        nextLegacy += (nextGroundTruth - nextLegacy) * 0.04 + (Math.random() - 0.5);
      } else {
        nextGroundTruth -= 0.1;
        nextLegacy -= 0.08;
      }

      let nextState = state;
      if (state === CookingState.HEATING_WATER) {
        if (nextGroundTruth >= RAMEN_RECIPE.targetTemp) {
          nextState = CookingState.WAITING_FOR_INGREDIENTS;
          currentPower = 2;
        }
      } else if (state === CookingState.COOKING_INGR_ACTIVE) {
        const frothFactor = isIngredientsAdded ? 4 : 1;
        nextVibration = 5 + (nextGroundTruth > 96 ? (nextGroundTruth - 96) * 6 * frothFactor : 0) + (Math.random() * 5);
        
        if (nextVibration > 38) {
          nextState = CookingState.PREDICTING_BOILOVER;
          currentPower = 2;
        } else if (remainingTime <= 0) {
          nextState = CookingState.COMPLETE;
          currentPower = 0;
          setIsRunning(false);
        } else {
          currentPower = 8;
        }
        setRemainingTime(prev => Math.max(0, prev - 0.2));
      } else if (state === CookingState.PREDICTING_BOILOVER) {
        nextVibration -= 6;
        if (nextVibration < 15) {
          nextState = CookingState.COOKING_INGR_ACTIVE;
        }
      }

      setState(nextState);
      setPower(currentPower);

      const newData: SensorData = {
        time: newTime,
        legacyTemp: Math.max(22, nextLegacy),
        groundTruthTemp: Math.max(22, nextGroundTruth),
        vibration: Math.max(2, nextVibration),
        soundFrequency: 100 + nextGroundTruth,
        powerLevel: currentPower
      };

      return [...prev, newData].slice(-50);
    });
  }, [state, power, remainingTime, isIngredientsAdded]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(simulateStep, 200);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, simulateStep]);

  const startRamenMode = () => {
    setIsRunning(true);
    setPower(10);
    setState(CookingState.HEATING_WATER);
    setRemainingTime(RAMEN_RECIPE.cookTime);
    setIsIngredientsAdded(false);
    setHistory([]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'System Arch':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass rounded-[2rem] p-8 border border-white/5">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <Layers className="text-blue-500" /> Multi-modal Sensor Fusion
              </h3>
              <div className="space-y-4 text-slate-400 text-sm leading-relaxed">
                <p>특허 번호 10-2708883에 따른 AI 인덕션 시스템은 기존의 간접 온도 계측 방식을 넘어 <strong>Ground Truth(직접 계측)</strong> 데이터를 핵심으로 사용합니다.</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>IR 열화상 센서를 통한 냄비 표면 온도 모니터링</li>
                  <li>Acoustic 센서를 통한 미세 진동 및 끓음 주파수 분석</li>
                  <li>전류 변화량 분석을 통한 자성체 효율 실시간 연산</li>
                </ul>
              </div>
            </div>
            <div className="glass rounded-[2rem] p-8 border border-white/5 flex items-center justify-center">
               <div className="relative w-64 h-64 bg-blue-500/10 rounded-full border border-blue-500/20 flex items-center justify-center">
                  <div className="absolute inset-4 border border-dashed border-blue-500/30 rounded-full animate-spin-slow" />
                  <div className="text-center">
                    <Zap className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                    <p className="font-bold">AI Core</p>
                    <p className="text-[10px] text-slate-500 uppercase">Patent Protected</p>
                  </div>
               </div>
            </div>
          </div>
        );
      case 'Analytics':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="glass rounded-[2rem] p-8 border border-white/5">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <BarChart2 className="text-blue-500" /> Efficiency Analysis
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" hide />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                    <Tooltip contentStyle={{backgroundColor: '#0a0a0c', border: 'none', borderRadius: '12px'}} />
                    <Area type="monotone" dataKey="groundTruthTemp" stroke="#3b82f6" fill="rgba(59, 130, 246, 0.1)" strokeWidth={3} />
                    <Area type="monotone" dataKey="powerLevel" stroke="#f59e0b" fill="rgba(245, 158, 11, 0.05)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
            <div className="lg:col-span-8 space-y-6">
              <div className="glass rounded-[2rem] p-6 lg:p-8 border border-white/5 relative overflow-hidden h-[450px]">
                <div className="absolute top-6 left-8 z-10 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/20">
                      <UtensilsCrossed className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Intelligence</h3>
                      <p className="text-xl font-bold tracking-tight">{RAMEN_RECIPE.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4">
                     <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                       <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">System Status</p>
                       <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${state === CookingState.IDLE ? 'bg-slate-600' : 'bg-emerald-500 animate-pulse'}`} />
                          <span className="text-sm font-semibold">{state.replace(/_/g, ' ')}</span>
                       </div>
                     </div>
                     
                     {(state === CookingState.COOKING_INGR_ACTIVE || state === CookingState.PREDICTING_BOILOVER) && (
                       <div className="px-4 py-2 bg-blue-600/10 rounded-2xl border border-blue-500/20 backdrop-blur-md">
                          <p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Cook Timer</p>
                          <div className="flex items-center gap-2">
                             <Timer className="w-4 h-4 text-blue-400" />
                             <span className="text-sm font-black tabular-nums tracking-tighter text-blue-100">
                               {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toFixed(0).padStart(2, '0')}
                             </span>
                          </div>
                       </div>
                     )}
                  </div>
                </div>

                <Visualizer 
                  state={state} 
                  temp={history[history.length - 1]?.groundTruthTemp || 22}
                  power={power}
                />

                <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 w-full md:w-auto">
                    <ShieldCheck className={`w-6 h-6 ${state === CookingState.PREDICTING_BOILOVER ? 'text-orange-500 animate-bounce' : 'text-emerald-500'}`} />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Boil-over Protection</p>
                      <p className="text-xs font-medium text-slate-200">
                        {state === CookingState.PREDICTING_BOILOVER ? 'Vibration Anomaly - Throttling Power' : 'Surface Monitoring Active'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto">
                    {state === CookingState.IDLE && (
                      <button onClick={startRamenMode} className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-2xl shadow-blue-600/20 transition-all hover:-translate-y-1">
                        <Play className="w-5 h-5 fill-current" /> 자동조리 시작
                      </button>
                    )}
                    {state === CookingState.WAITING_FOR_INGREDIENTS && (
                      <button onClick={() => { setIsIngredientsAdded(true); setState(CookingState.COOKING_INGR_ACTIVE); setPower(8); }} className="w-full md:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-2xl shadow-emerald-600/20 animate-bounce transition-all">
                        <UtensilsCrossed className="w-5 h-5" /> 재료 투입 완료
                      </button>
                    )}
                    {state === CookingState.COMPLETE && (
                      <button onClick={() => {setState(CookingState.IDLE); setHistory([]);}} className="w-full md:w-auto px-8 py-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-2xl font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> 조리 완료 (확인)
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
                    <Thermometer className="w-4 h-4 text-orange-400" /> Thermal Ground Truth (GT)
                  </h4>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="colorGt" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={[0, 120]} />
                        <Tooltip contentStyle={{backgroundColor: '#0a0a0c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}} />
                        <Area type="monotone" dataKey="groundTruthTemp" stroke="#f97316" fill="url(#colorGt)" strokeWidth={3} isAnimationActive={false} />
                        <Line type="monotone" dataKey="legacyTemp" stroke="#475569" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="glass rounded-3xl p-6 border border-white/5">
                  <h4 className="text-xs font-bold mb-4 flex items-center gap-2 text-slate-400 uppercase tracking-widest">
                    <Waves className="w-4 h-4 text-blue-400" /> Acoustic & Vibration Pulse
                  </h4>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Line type="monotone" dataKey="vibration" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
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
                    <StepItem done={state !== CookingState.IDLE && state !== CookingState.HEATING_WATER} active={state === CookingState.HEATING_WATER} label="수온 가열 단계 (100°C 도달)" />
                    <StepItem done={isIngredientsAdded} active={state === CookingState.WAITING_FOR_INGREDIENTS} label="면/스프 투입 및 안정화" />
                    <StepItem done={state === CookingState.COMPLETE} active={state === CookingState.COOKING_INGR_ACTIVE || state === CookingState.PREDICTING_BOILOVER} label="AI 넘침 감지 및 자율 화력 조절" />
                    <StepItem done={false} active={state === CookingState.COMPLETE} label="조리 완료 및 전원 차단" />
                 </div>
              </div>

              <div className="glass rounded-3xl p-6 border border-white/5">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">실시간 연산 효율</h3>
                    <Zap className="w-4 h-4 text-yellow-500" />
                 </div>
                 <div className="space-y-4">
                    <MetricCard label="Induction Power" value={`${power}/10`} description="Dynamic Level" icon={<Zap />} />
                    <MetricCard label="Thermal Precision" value="±0.2°C" description="GT Direct Sensing" improvement icon={<Activity />} />
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
        {renderContent()}
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
