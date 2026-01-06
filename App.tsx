
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
  Flame,
  LayoutGrid
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
  const [isIngredientsAdded, setIsIngredientsAdded] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(RECIPES[0]);
  const [uniformity, setUniformity] = useState(100);
  
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

      // Heating logic
      if (currentPower > 0) {
        const target = selectedRecipe.targetTemp;
        const heatGain = (currentPower / 12) * (1.5 - nextGroundTruth / (target + 50));
        nextGroundTruth += heatGain;
        nextLegacy += (nextGroundTruth - nextLegacy) * 0.04 + (Math.random() - 0.5);

        // Uniformity logic: If in Enveloping mode, uniformity stays high. 
        // In Direct mode (legacy), it drops as center gets hot.
        if (selectedRecipe.isEnvelopingRequired) {
          nextUniformity = Math.min(100, nextUniformity + 0.5);
        } else {
          nextUniformity = Math.max(40, nextUniformity - 0.2);
        }
      } else {
        nextGroundTruth -= 0.15;
        nextLegacy -= 0.1;
        nextUniformity = Math.min(100, nextUniformity + 0.1); // Cooling down balances temp
      }

      let nextState = state;
      if (state === CookingState.HEATING_WATER) {
        if (nextGroundTruth >= selectedRecipe.targetTemp) {
          if (selectedRecipe.id === 'water') {
            nextState = CookingState.COMPLETE;
            currentPower = 0;
            setIsRunning(false);
          } else {
            nextState = CookingState.WAITING_FOR_INGREDIENTS;
            currentPower = 2;
          }
        }
      } else if (state === CookingState.COOKING_INGR_ACTIVE) {
        const frothFactor = isIngredientsAdded ? (selectedRecipe.id === 'fish_fry' ? 1.5 : 4) : 1;
        const boilThreshold = selectedRecipe.targetTemp - 4;
        
        nextVibration = 5 + (nextGroundTruth > boilThreshold ? (nextGroundTruth - boilThreshold) * 6 * frothFactor : 0) + (Math.random() * 5);
        
        if (nextVibration > 40 && !selectedRecipe.isEnvelopingRequired) {
          nextState = CookingState.PREDICTING_BOILOVER;
          currentPower = 2;
        } else if (remainingTime <= 0) {
          nextState = CookingState.COMPLETE;
          currentPower = 0;
          setIsRunning(false);
        } else {
          currentPower = 8;
        }
        setRemainingTime(prev => Math.max(0, prev - 0.5));
      } else if (state === CookingState.PREDICTING_BOILOVER) {
        nextVibration -= 8;
        if (nextVibration < 15) {
          nextState = CookingState.COOKING_INGR_ACTIVE;
        }
      }

      setState(nextState);
      setPower(currentPower);
      setUniformity(nextUniformity);

      const newData: SensorData = {
        time: newTime,
        legacyTemp: Math.max(22, nextLegacy),
        groundTruthTemp: Math.max(22, nextGroundTruth),
        vibration: Math.max(2, nextVibration),
        soundFrequency: 100 + nextGroundTruth,
        powerLevel: currentPower,
        heatUniformity: nextUniformity
      };

      return [...prev, newData].slice(-60);
    });
  }, [state, power, remainingTime, isIngredientsAdded, selectedRecipe]);

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
    setPower(selectedRecipe.isEnvelopingRequired ? 6 : 10); // Enveloping starts slower for balance
    setState(CookingState.HEATING_WATER);
    setRemainingTime(selectedRecipe.cookTime);
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
              {/* Recipe Selector */}
              <div className="glass rounded-3xl p-4 border border-white/5 overflow-x-auto no-scrollbar">
                <div className="flex gap-4 min-w-max px-2">
                  {RECIPES.map((recipe) => (
                    <button
                      key={recipe.id}
                      disabled={isRunning}
                      onClick={() => setSelectedRecipe(recipe)}
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

              <div className="glass rounded-[2rem] p-6 lg:p-8 border border-white/5 relative overflow-hidden h-[450px]">
                <div className="absolute top-6 left-8 z-10 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl shadow-lg ${selectedRecipe.isEnvelopingRequired ? 'bg-orange-600 shadow-orange-900/20' : 'bg-blue-600 shadow-blue-900/20'}`}>
                      {selectedRecipe.isEnvelopingRequired ? <Flame className="w-5 h-5 text-white" /> : <Zap className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {selectedRecipe.isEnvelopingRequired ? 'Enveloping Heat Mode' : 'Direct Induction Mode'}
                      </h3>
                      <p className="text-xl font-bold tracking-tight">{selectedRecipe.name} 자동조리</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-4">
                     <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                       <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">System Status</p>
                       <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${state === CookingState.IDLE ? 'bg-slate-600' : 'bg-emerald-500 animate-pulse'}`} />
                          <span className="text-sm font-semibold">{state.replace(/_/g, ' ')}</span>
                       </div>
                     </div>
                     
                     <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Heat Uniformity</p>
                        <div className="flex items-center gap-2">
                           <LayoutGrid className="w-4 h-4 text-emerald-400" />
                           <span className="text-sm font-black text-emerald-400">{uniformity.toFixed(0)}%</span>
                        </div>
                     </div>
                  </div>
                </div>

                <Visualizer 
                  state={state} 
                  temp={history[history.length - 1]?.groundTruthTemp || 22}
                  power={power}
                  isEnvelopingMode={selectedRecipe.isEnvelopingRequired}
                />

                <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 w-full md:w-auto">
                    <ShieldCheck className={`w-6 h-6 ${state === CookingState.PREDICTING_BOILOVER ? 'text-orange-500 animate-bounce' : 'text-emerald-500'}`} />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Smart Protection</p>
                      <p className="text-xs font-medium text-slate-200">
                        {state === CookingState.PREDICTING_BOILOVER ? '넘침 전조 감지 - 화력 자율 제어 중' : `${selectedRecipe.name} 최적 온도 및 균일도 모니터링`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto">
                    {state === CookingState.IDLE && (
                      <button onClick={startCooking} className={`w-full md:w-auto px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-2xl transition-all hover:-translate-y-1 ${
                        selectedRecipe.isEnvelopingRequired ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                      }`}>
                        <Play className="w-5 h-5 fill-current" /> 자율 조리 시작
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
                    <Thermometer className="w-4 h-4 text-orange-400" /> Thermal Distribution Analysis
                  </h4>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="colorUniformity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Area type="monotone" dataKey="heatUniformity" stroke="#10b981" fill="url(#colorUniformity)" strokeWidth={3} isAnimationActive={false} />
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
                    <StepItem done={state !== CookingState.IDLE && state !== CookingState.HEATING_WATER} active={state === CookingState.HEATING_WATER} label={`${selectedRecipe.targetTemp}°C 가열 단계`} />
                    {selectedRecipe.id !== 'water' && (
                      <StepItem done={isIngredientsAdded} active={state === CookingState.WAITING_FOR_INGREDIENTS} label="주재료 투입 및 안정화" />
                    )}
                    <StepItem done={state === CookingState.COMPLETE} active={state === CookingState.COOKING_INGR_ACTIVE || state === CookingState.PREDICTING_BOILOVER} label={selectedRecipe.isEnvelopingRequired ? "입체 가열 알고리즘 활성" : "AI 자율 제어 및 정밀 가열"} />
                    <StepItem done={false} active={state === CookingState.COMPLETE} label="조리 완료 및 자동 차단" />
                 </div>
              </div>

              <div className="glass rounded-3xl p-6 border border-white/5">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">AI 알고리즘 정보</h3>
                    <Database className="w-4 h-4 text-blue-500" />
                 </div>
                 <div className="space-y-4">
                    <div className={`p-4 rounded-2xl border ${selectedRecipe.isEnvelopingRequired ? 'bg-orange-500/5 border-orange-500/10' : 'bg-blue-500/5 border-blue-500/10'}`}>
                      <p className={`text-xs font-bold mb-1 ${selectedRecipe.isEnvelopingRequired ? 'text-orange-400' : 'text-blue-400'}`}>
                        {selectedRecipe.isEnvelopingRequired ? 'Enveloping Algorithm' : 'Direct Logic'}
                      </p>
                      <p className="text-sm text-slate-300 leading-relaxed">{selectedRecipe.description}</p>
                    </div>
                    <MetricCard label="Target Temp" value={`${selectedRecipe.targetTemp}°C`} description="Ground Truth Goal" icon={<Thermometer />} />
                    <MetricCard label="Uniformity Target" value="95%" description="Heat Distribution" improvement icon={<LayoutGrid />} />
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
