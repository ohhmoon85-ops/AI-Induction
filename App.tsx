
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
  Bell
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
      let nextRemainingTime = remainingTime;

      // Heating logic
      if (currentPower > 0) {
        const target = selectedRecipe.targetTemp;
        const heatGain = (currentPower / 12) * (1.5 - nextGroundTruth / (target + 50));
        nextGroundTruth += heatGain;
        nextLegacy += (nextGroundTruth - nextLegacy) * 0.04 + (Math.random() - 0.5);

        if (selectedRecipe.isEnvelopingRequired) {
          nextUniformity = Math.min(100, nextUniformity + 0.5);
        } else {
          nextUniformity = Math.max(40, nextUniformity - 0.2);
        }
      } else {
        nextGroundTruth -= 0.15;
        nextLegacy -= 0.1;
        nextUniformity = Math.min(100, nextUniformity + 0.1);
      }

      let nextState = state;
      
      // 타이머 및 상태 머신 로직 (사용자 피드백 반영: 재료 투입 후부터 카운트다운)
      if (state === CookingState.HEATING_WATER) {
        // 예열 중에는 타이머를 레시피 기본 시간으로 고정 (줄어들지 않음)
        nextRemainingTime = selectedRecipe.cookTime;

        if (nextGroundTruth >= selectedRecipe.targetTemp) {
          if (selectedRecipe.id === 'water') {
            // 물끓이기는 예열(끓는점 도달)이 곧 완료
            nextState = CookingState.COMPLETE;
            currentPower = 0;
            setIsRunning(false);
          } else if (selectedRecipe.autoStartCook) {
            // 밥하기 등 자동 시작 메뉴
            nextState = CookingState.COOKING_INGR_ACTIVE;
          } else {
            // 찌개/튀김 등 재료 투입 대기 메뉴
            nextState = CookingState.WAITING_FOR_INGREDIENTS;
            currentPower = 2; // 보온 화력
          }
        }
      } else if (state === CookingState.WAITING_FOR_INGREDIENTS) {
        // 재료 넣기 전까지 타이머 고정
        nextRemainingTime = selectedRecipe.cookTime;
      } else if (state === CookingState.COOKING_INGR_ACTIVE) {
        // 재료 투입 완료 후부터 실제 카운트다운 시작
        nextRemainingTime = Math.max(0, nextRemainingTime - 0.5);
        
        const frothFactor = isIngredientsAdded ? (selectedRecipe.id === 'fish_fry' ? 1.5 : 4) : 1;
        const boilThreshold = selectedRecipe.targetTemp - 4;
        
        nextVibration = 5 + (nextGroundTruth > boilThreshold ? (nextGroundTruth - boilThreshold) * 6 * frothFactor : 0) + (Math.random() * 5);
        
        if (nextVibration > 40 && !selectedRecipe.isEnvelopingRequired) {
          nextState = CookingState.PREDICTING_BOILOVER;
          currentPower = 2;
        } else if (nextRemainingTime <= 0) {
          nextState = CookingState.COMPLETE;
          currentPower = 0;
          setIsRunning(false);
        } else {
          currentPower = 8;
        }
      } else if (state === CookingState.PREDICTING_BOILOVER) {
        nextRemainingTime = Math.max(0, nextRemainingTime - 0.5);
        nextVibration -= 8;
        if (nextVibration < 15) {
          nextState = CookingState.COOKING_INGR_ACTIVE;
        }
      }

      setState(nextState);
      setPower(currentPower);
      setUniformity(nextUniformity);
      setRemainingTime(nextRemainingTime);

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
    setPower(selectedRecipe.isEnvelopingRequired ? 6 : 10);
    setState(CookingState.HEATING_WATER);
    setRemainingTime(selectedRecipe.cookTime);
    setIsIngredientsAdded(selectedRecipe.autoStartCook || false);
    setHistory([]);
  };

  const currentTemp = history[history.length - 1]?.groundTruthTemp || 22;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0c] text-slate-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 flex flex-col overflow-y-auto p-4 lg:p-6 space-y-6">
        <Header activeTab={activeTab} />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
          <div className="lg:col-span-8 space-y-6 relative">
            
            {/* 조리 완료 알람 레이어 */}
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
                         <span className="text-sm font-black text-white">{currentTemp.toFixed(1)}°</span>
                         <span className="text-[10px] text-slate-500">/ Goal {selectedRecipe.targetTemp}°</span>
                      </div>
                   </div>

                   {/* 잔여 시간 - 상태에 따른 텍스트 분기 */}
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
