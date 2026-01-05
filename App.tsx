
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, 
  Zap, 
  ShieldCheck, 
  Thermometer, 
  Waves, 
  AlertTriangle,
  Play,
  Square,
  ChevronRight,
  Info,
  Clock,
  UtensilsCrossed,
  Timer
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
import { SensorData, CookingState, RAMEN_RECIPE, Recipe } from './types';

// Components
import Header from './components/Header';
import MetricCard from './components/MetricCard';
import Visualizer from './components/Visualizer';
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
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

      // 1. Heating Logic
      if (currentPower > 0) {
        // High thermal efficiency near boiling
        const heatGain = (currentPower / 15) * (1.1 - nextGroundTruth / 130);
        nextGroundTruth += heatGain;
        nextLegacy += (nextGroundTruth - nextLegacy) * 0.04 + (Math.random() - 0.5);
      } else {
        nextGroundTruth -= 0.15;
        nextLegacy -= 0.1;
      }

      // 2. State Machine Logic (Ramen Auto Mode)
      let nextState = state;

      if (state === CookingState.HEATING_WATER) {
        if (nextGroundTruth >= RAMEN_RECIPE.targetTemp) {
          nextState = CookingState.WAITING_FOR_INGREDIENTS;
          currentPower = 2; // Keep warm
        }
      } else if (state === CookingState.COOKING_INGR_ACTIVE) {
        // Boil-over prevention logic when noodles are in
        // Starch causes more vibration and sudden froth rising
        const frothFactor = isIngredientsAdded ? 4 : 1;
        nextVibration = 5 + (nextGroundTruth > 96 ? (nextGroundTruth - 96) * 5 * frothFactor : 0) + (Math.random() * 5);
        
        if (nextVibration > 35) {
          nextState = CookingState.PREDICTING_BOILOVER;
          currentPower = 3; // Drastic reduction
        } else if (remainingTime <= 0) {
          nextState = CookingState.COMPLETE;
          currentPower = 0;
          setIsRunning(false);
        } else {
          currentPower = 8; // Normal boiling power
        }
        
        setRemainingTime(prev => Math.max(0, prev - 0.2)); // 0.2s per step
      } else if (state === CookingState.PREDICTING_BOILOVER) {
        nextVibration -= 5; // Recovery
        if (nextVibration < 20) {
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

  const addIngredients = () => {
    setIsIngredientsAdded(true);
    setState(CookingState.COOKING_INGR_ACTIVE);
    setPower(8);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0c] text-slate-100">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
        <Header />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-8 space-y-6">
            {/* Main Visualizer Area */}
            <div className="glass rounded-3xl p-8 border border-white/5 relative overflow-hidden h-[450px]">
              
              {/* Ramen Mode HUD */}
              <div className="absolute top-6 left-8 z-10 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <UtensilsCrossed className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recipe Active</h3>
                    <p className="text-xl font-bold">{RAMEN_RECIPE.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                   <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                     <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Status</p>
                     <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${state === CookingState.IDLE ? 'bg-slate-500' : 'bg-emerald-500 animate-pulse'}`} />
                        <span className="text-sm font-semibold">{state.replace(/_/g, ' ')}</span>
                     </div>
                   </div>
                   
                   {state === CookingState.COOKING_INGR_ACTIVE && (
                     <div className="px-4 py-2 bg-blue-600/20 rounded-2xl border border-blue-500/30">
                        <p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Time Remaining</p>
                        <div className="flex items-center gap-2">
                           <Timer className="w-4 h-4 text-blue-400" />
                           <span className="text-sm font-black tabular-nums">{Math.floor(remainingTime / 60)}:{(remainingTime % 60).toFixed(0).padStart(2, '0')}</span>
                        </div>
                     </div>
                   )}
                </div>
              </div>

              <Visualizer 
                state={state as any} 
                temp={history[history.length - 1]?.groundTruthTemp || 22}
                power={power}
              />

              {/* Interaction Overlays */}
              <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center">
                <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <ShieldCheck className={`w-6 h-6 ${state === CookingState.PREDICTING_BOILOVER ? 'text-orange-500 animate-bounce' : 'text-emerald-500'}`} />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">AI Safety Protocol</p>
                    <p className="text-xs font-medium">
                      {state === CookingState.PREDICTING_BOILOVER ? 'Sudden Froth Detected - Reducing Power' : 'Surface Monitoring Active'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {state === CookingState.IDLE && (
                    <button onClick={startRamenMode} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-900/40 transition-all active:scale-95">
                      <Play className="w-5 h-5 fill-current" /> 라면 자동조리 시작
                    </button>
                  )}
                  {state === CookingState.WAITING_FOR_INGREDIENTS && (
                    <button onClick={addIngredients} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-emerald-900/40 animate-bounce transition-all">
                      <UtensilsCrossed className="w-5 h-5" /> 면과 스프를 넣었습니다
                    </button>
                  )}
                  {isRunning && (
                    <button onClick={() => {setIsRunning(false); setState(CookingState.IDLE);}} className="p-4 bg-red-600/20 hover:bg-red-600/40 text-red-500 rounded-2xl border border-red-500/30 transition-all">
                      <Square className="w-5 h-5 fill-current" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Real-time Telemetry Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass rounded-3xl p-6 border border-white/5">
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-orange-400" /> Ground Truth Thermal Response
                </h4>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="time" hide />
                      <Tooltip contentStyle={{backgroundColor: '#111', border: 'none', borderRadius: '8px'}} />
                      <Area type="monotone" dataKey="groundTruthTemp" stroke="#f97316" fill="rgba(249,115,22,0.1)" strokeWidth={3} />
                      <Line type="monotone" dataKey="legacyTemp" stroke="#475569" strokeDasharray="3 3" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass rounded-3xl p-6 border border-white/5">
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Waves className="w-4 h-4 text-blue-400" /> Surface Vibration Analysis
                </h4>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="time" hide />
                      <Line type="monotone" dataKey="vibration" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      {state === CookingState.PREDICTING_BOILOVER && <rect x="0" y="0" width="100%" height="100%" fill="rgba(239,68,68,0.1)" />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="glass rounded-3xl p-6 border border-white/5">
               <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                 <Clock className="w-5 h-5 text-blue-500" /> 조리 진행 단계
               </h3>
               <div className="space-y-6 relative">
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-white/10" />
                  
                  <StepItem 
                    done={state !== CookingState.IDLE && state !== CookingState.HEATING_WATER} 
                    active={state === CookingState.HEATING_WATER} 
                    label="물 끓이기 (최고 화력)" 
                  />
                  <StepItem 
                    done={isIngredientsAdded} 
                    active={state === CookingState.WAITING_FOR_INGREDIENTS} 
                    label="면/스프 투입 대기" 
                  />
                  <StepItem 
                    done={state === CookingState.COMPLETE} 
                    active={state === CookingState.COOKING_INGR_ACTIVE || state === CookingState.PREDICTING_BOILOVER} 
                    label="자동 조리 & 넘침 방지" 
                  />
                  <StepItem 
                    done={false} 
                    active={state === CookingState.COMPLETE} 
                    label="조리 완료" 
                  />
               </div>
            </div>

            <div className="glass rounded-3xl p-6 border border-white/5">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold">시스템 효율</h3>
                  <Zap className="w-4 h-4 text-yellow-400" />
               </div>
               <div className="space-y-4">
                  <MetricCard label="Power Output" value={`${power}/10`} description="Current IH Level" icon={<Zap />} />
                  <MetricCard label="Energy Saving" value="28%" description="Precise control" improvement icon={<Activity />} />
               </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

const StepItem: React.FC<{ done: boolean, active: boolean, label: string }> = ({ done, active, label }) => (
  <div className={`relative flex items-center gap-6 pl-2 transition-all ${active ? 'opacity-100 scale-105' : 'opacity-40'}`}>
    <div className={`w-4 h-4 rounded-full z-10 ${done ? 'bg-blue-500' : active ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-slate-700'}`} />
    <span className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-400'}`}>{label}</span>
  </div>
);

export default App;
