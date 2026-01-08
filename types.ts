
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
  DISTURBANCE_DETECTED = 'DISTURBANCE_DETECTED', // 외란 감지 상태 추가
  COMPLETE = 'COMPLETE'
}

export type CookingType = 'BOILING' | 'FRYING' | 'STIR_FRYING' | 'SIMMERING' | 'UNKNOWN';

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
    id: 'ramen',
    name: '라면',
    targetTemp: 100,
    cookTime: 240,
    description: '물 550ml 기준, 면/스프 투하 시 넘침 감지 및 동적 화력 제어',
    icon: '🍜',
    canReserve: true,
    autoStartCook: false // 물이 끓으면 사용자에게 알림 후 면 투하 대기
  },
  {
    id: 'kimchi',
    name: '김치찌개',
    targetTemp: 100,
    cookTime: 900,
    description: '깊은 맛을 위한 고온 유지 및 졸임 제어',
    icon: '🥘',
    isEnvelopingRequired: true,
    canReserve: true
  },
  {
    id: 'rice',
    name: '밥하기',
    targetTemp: 105,
    cookTime: 1200,
    description: '뜸 들이기 단계를 포함한 압력/온도 제어',
    icon: '🍚',
    autoStartCook: true,
    canReserve: true
  },
  {
    id: 'miyeok',
    name: '미역국',
    targetTemp: 100,
    cookTime: 1200,
    description: '뭉근한 가열로 깊은 육수 추출 최적화',
    icon: '🥣',
    isEnvelopingRequired: true,
    canReserve: true
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
