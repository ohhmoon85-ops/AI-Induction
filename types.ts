
export interface SensorData {
  time: number;
  legacyTemp: number;
  groundTruthTemp: number;
  vibration: number;
  soundFrequency: number;
  powerLevel: number;
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
}

export const RAMEN_RECIPE: Recipe = {
  id: 'ramen',
  name: '신라면 자동조리',
  targetTemp: 100,
  cookTime: 240, // 4 minutes
  description: '물 550ml, 면/스프 자동 넘침 방지 최적화'
};
