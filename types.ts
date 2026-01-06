
export interface SensorData {
  time: number;
  legacyTemp: number;
  groundTruthTemp: number;
  vibration: number;
  soundFrequency: number;
  powerLevel: number;
  heatUniformity: number;
}

export enum CookingState {
  IDLE = 'IDLE',
  HEATING_WATER = 'HEATING_WATER',
  WAITING_FOR_INGREDIENTS = 'WAITING_FOR_INGREDIENTS',
  COOKING_INGR_ACTIVE = 'COOKING_INGR_ACTIVE',
  PREDICTING_BOILOVER = 'PREDICTING_BOILOVER',
  COMPLETE = 'COMPLETE'
}

export interface Recipe {
  id: string;
  name: string;
  targetTemp: number;
  cookTime: number; // 초 단위
  description: string;
  icon: string;
  isEnvelopingRequired?: boolean;
  autoStartCook?: boolean; // 재료 투입 대기 없이 바로 조리 카운트다운 시작 여부
}

export const RECIPES: Recipe[] = [
  {
    id: 'water',
    name: '물끓이기',
    targetTemp: 100,
    cookTime: 60,
    description: '가장 빠른 속도로 가열 후 자동 차단',
    icon: '💧',
    autoStartCook: true
  },
  {
    id: 'kimchi',
    name: '김치찌개',
    targetTemp: 100,
    cookTime: 900,
    description: '깊은 맛을 위한 고온 유지 및 졸임 제어',
    icon: '🥘',
    isEnvelopingRequired: true
  },
  {
    id: 'doenjang',
    name: '된장찌개',
    targetTemp: 100,
    cookTime: 600,
    description: '향 손실 최소화를 위한 정밀 온도 제어',
    icon: '🍲',
    isEnvelopingRequired: true
  },
  {
    id: 'miyeok',
    name: '미역국',
    targetTemp: 100,
    cookTime: 1200,
    description: '뭉근한 가열로 육수 추출 최적화',
    icon: '🥣',
    isEnvelopingRequired: true
  },
  {
    id: 'fish_fry',
    name: '생선튀김',
    targetTemp: 180,
    cookTime: 480,
    description: '180°C 항온 제어로 겉바속촉 구현',
    icon: '🐟',
    isEnvelopingRequired: true
  },
  {
    id: 'rice',
    name: '밥하기',
    targetTemp: 105,
    cookTime: 1200,
    description: '뜸 들이기 단계를 포함한 압력/온도 제어',
    icon: '🍚',
    autoStartCook: true
  },
  {
    id: 'ramen',
    name: '라면',
    targetTemp: 100,
    cookTime: 240,
    description: '물 550ml, 면/스프 자율 넘침 방지',
    icon: '🍜'
  }
];
