
export interface SensorData {
  time: number;
  legacyTemp: number;
  groundTruthTemp: number;
  vibration: number;
  soundFrequency: number;
  powerLevel: number;
  heatUniformity: number;
  sensorArray: number[]; // 210(중앙) + 220(주변 8개) 센서 데이터
}

export enum CookingState {
  IDLE = 'IDLE',
  RESERVED = 'RESERVED',
  HEATING_WATER = 'HEATING_WATER',
  WAITING_FOR_INGREDIENTS = 'WAITING_FOR_INGREDIENTS',
  COOKING_INGR_ACTIVE = 'COOKING_INGR_ACTIVE',
  PREDICTING_BOILOVER = 'PREDICTING_BOILOVER',
  DISTURBANCE_DETECTED = 'DISTURBANCE_DETECTED',
  COMPLETE = 'COMPLETE'
}

export type CookingType = 'BOILING' | 'FRYING' | 'STIR_FRYING' | 'SIMMERING' | 'PANCAKE' | 'UNKNOWN';

export interface VesselInfo {
  material: 'Stainless' | 'Cast Iron' | 'Aluminum' | 'Unknown';
  size: 'Small' | 'Medium' | 'Large';
  alignment: 'Centered' | 'Eccentric';
}

export interface Recipe {
  id: string;
  name: string;
  targetTemp: number;
  cookTime: number;
  description: string;
  icon: string;
  isEnvelopingRequired?: boolean;
  autoStartCook?: boolean;
  canReserve?: boolean;
}

export const RECIPES: Recipe[] = [
  {
    id: 'auto',
    name: 'AI 자동 인지',
    targetTemp: 100,
    cookTime: 0,
    description: '용기와 조리 형태를 AI가 스스로 판단하여 최적 제어',
    icon: '🧠',
    canReserve: false
  },
  {
    id: 'pancake',
    name: '전/부침',
    targetTemp: 180, // 160 -> 180 상향
    cookTime: 600,
    description: '중앙 집중 과열을 방지하고 팬 전체를 균일하게 가열',
    icon: '🍳',
    canReserve: false,
    isEnvelopingRequired: true
  },
  {
    id: 'ramen',
    name: '라면',
    targetTemp: 100,
    cookTime: 240,
    description: '물 550ml 기준, 넘침 감지 및 동적 화력 제어',
    icon: '🍜',
    canReserve: true,
    autoStartCook: false
  },
  {
    id: 'fish_fry',
    name: '생선튀김',
    targetTemp: 180,
    cookTime: 480,
    description: '180°C 항온 제어로 조리 완성도 극대화',
    icon: '🐟',
    isEnvelopingRequired: true,
    canReserve: false
  }
];
