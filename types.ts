
export interface SensorData {
  time: number;
  legacyTemp: number;
  groundTruthTemp: number;
  vibration: number;
  soundFrequency: number;
  powerLevel: number;
  heatUniformity: number; // 0 to 100, 얼마나 균일하게 열이 퍼졌는가
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
  cookTime: number; // in seconds
  description: string;
  icon: string;
  isEnvelopingRequired?: boolean; // 가스레인지식 감싸는 열이 필요한지 여부
}

export const RECIPES: Recipe[] = [
  {
    id: 'ramen',
    name: '신라면',
    targetTemp: 100,
    cookTime: 240,
    description: '물 550ml, 면/스프 자율 넘침 방지',
    icon: '🍜'
  },
  {
    id: 'pancake',
    name: '모듬전',
    targetTemp: 160,
    cookTime: 600,
    description: '가스레인지식 감싸는 열(Enveloping Heat) 알고리즘 적용, 팬 가장자리까지 균일 가열',
    icon: '🍳',
    isEnvelopingRequired: true
  },
  {
    id: 'kimchi',
    name: '김치찌개',
    targetTemp: 100,
    cookTime: 900,
    description: '깊은 맛을 위한 고온 유지 및 졸임 제어',
    icon: '🥘'
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
    icon: '🍚'
  },
  {
    id: 'water',
    name: '물끓이기',
    targetTemp: 100,
    cookTime: 30,
    description: '가장 빠른 속도로 끓인 후 자동 차단',
    icon: '💧'
  }
];

export const RAMEN_RECIPE = RECIPES[0];
