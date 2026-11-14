import type { CarbUnit } from './foods'
export type SlotId = 'early' | 'breakfast' | 'mid' | 'lunch' | 'pre' | 'evening' | 'post' | 'dinner' | 'bed'
export interface MealOption {
  id: string
  /** `{c}` is replaced by the scaled carb portion, e.g. "3 roti". */
  name: string
  kcal: number
  protein: number
  tag?: 'S' | 'N'
  egg?: boolean
  whey?: number
  /** Scalable carb at the base portion. min/max override the defaults in foods.ts. */
  carb?: { unit: CarbUnit; qty: number; min?: number; max?: number }
  /** Grocery shorthand "item:qty,item:qty" (excluding the scalable carb). */
  g: string
}
export interface SlotDef { id: SlotId; label: string; optional?: boolean; options: MealOption[] }
export interface MealPlan { slots: SlotDef[]; tips: string[] }
