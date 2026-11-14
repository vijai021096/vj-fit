import type { MealPlan } from './meals.types'

/**
 * VIKAS meal pools (Section 8C). kcal / protein are the coach's base-portion numbers.
 * Where the coach gave no carb quantity (lunch rice/roti), the base portion below is an estimate
 * so the scaler has something to display — the kcal totals are unchanged.
 */
export const vikasMeals: MealPlan = {
  slots: [
    { id: 'early', label: 'Early morning', options: [
      { id: 'v-e1', name: '10 soaked almonds + 1 banana', kcal: 175, protein: 4, g: 'almonds:10,banana:1' },
      { id: 'v-e2', name: '30 g roasted peanuts + black coffee', kcal: 170, protein: 8, g: 'peanuts:30' },
      { id: 'v-e3', name: '4 walnut halves + 3 dates', kcal: 170, protein: 3, g: 'walnuts:4,dates:3' },
    ] },
    { id: 'breakfast', label: 'Breakfast', options: [
      { id: 'v-b1', name: '4-egg omelette + 2 slices whole-wheat bread', kcal: 430, protein: 30, egg: true, g: 'eggs:4,bread:2' },
      { id: 'v-b2', name: '{c} + sambar + 3-egg omelette', kcal: 560, protein: 28, tag: 'S', egg: true, carb: { unit: 'idli', qty: 4 }, g: 'eggs:3,toor:25,veg:80' },
      { id: 'v-b3', name: '3 pesarattu + ginger chutney + 2 boiled eggs', kcal: 600, protein: 36, tag: 'S', egg: true, g: 'moong:105,eggs:2' },
      { id: 'v-b4', name: 'Paneer bhurji 150 g + 2 wheat toast', kcal: 600, protein: 32, tag: 'N', g: 'paneer:150,bread:2,veg:50' },
      { id: 'v-b5', name: '{c} + 3-egg bhurji', kcal: 550, protein: 26, tag: 'S', egg: true, carb: { unit: 'ragi-dosa', qty: 3 }, g: 'eggs:3,veg:40' },
      { id: 'v-b6', name: '{c} in 300 ml milk + banana + 10 almonds', kcal: 560, protein: 20, carb: { unit: 'oats', qty: 60 }, g: 'milk:300,banana:1,almonds:10' },
    ] },
    { id: 'mid', label: 'Mid-morning', options: [
      { id: 'v-m1', name: 'Whey in 300 ml milk + 1 tbsp peanut butter', kcal: 395, protein: 37, whey: 1, g: 'whey:1,milk:300,pb:1' },
      { id: 'v-m2', name: 'Banana + 300 ml milk + 20 g peanuts', kcal: 390, protein: 15, g: 'banana:1,milk:300,peanuts:20' },
      { id: 'v-m3', name: 'Greek yogurt 200 g + 1 tsp honey + 10 almonds', kcal: 300, protein: 20, g: 'gy:200,almonds:10' },
      { id: 'v-m4', name: 'Sprouts chaat 1½ cups + buttermilk', kcal: 220, protein: 14, g: 'moong:60,buttermilk:1,salad:50' },
    ] },
    { id: 'lunch', label: 'Lunch', options: [
      { id: 'v-l1', name: '{c} + sambar + paneer curry 150 g + curd + poriyal', kcal: 900, protein: 45, tag: 'S', carb: { unit: 'rice', qty: 1.5 }, g: 'toor:25,paneer:150,curd:150,veg:180' },
      { id: 'v-l2', name: '{c} + rajma + 2-egg bhurji + curd + salad', kcal: 850, protein: 40, tag: 'N', egg: true, carb: { unit: 'roti', qty: 3 }, g: 'rajma:45,eggs:2,curd:150,salad:100' },
      { id: 'v-l3', name: '{c} + soya chunk curry (50 g dry) + dal + curd', kcal: 800, protein: 48, carb: { unit: 'rice', qty: 1.5 }, g: 'soya:50,toor:30,curd:150,veg:60' },
      { id: 'v-l4', name: 'Curd rice ({c}) + 3-egg curry + kootu', kcal: 800, protein: 32, tag: 'S', egg: true, carb: { unit: 'rice', qty: 1.5 }, g: 'curd:150,eggs:3,toor:20,veg:120' },
      { id: 'v-l5', name: '{c} + chana masala + raita + salad', kcal: 800, protein: 30, tag: 'N', carb: { unit: 'roti', qty: 4 }, g: 'chana:50,curd:150,salad:100' },
      { id: 'v-l6', name: 'Veg pulao ({c}) + paneer tikka 150 g + raita', kcal: 900, protein: 42, tag: 'N', carb: { unit: 'rice', qty: 1.5 }, g: 'paneer:150,curd:150,veg:100' },
    ] },
    { id: 'pre', label: 'Pre-workout', options: [
      { id: 'v-p1', name: 'Banana + black coffee', kcal: 110, protein: 1, g: 'banana:1' },
      { id: 'v-p2', name: '3–4 dates + black coffee', kcal: 140, protein: 1, g: 'dates:4' },
      { id: 'v-p3', name: '2 slices bread + 1 tbsp peanut butter', kcal: 235, protein: 9, g: 'bread:2,pb:1' },
    ] },
    { id: 'post', label: 'Post-workout', options: [
      { id: 'v-w1', name: 'Whey in water + 2 boiled eggs + banana', kcal: 365, protein: 37, whey: 1, egg: true, g: 'whey:1,eggs:2,banana:1' },
      { id: 'v-w2', name: 'Paneer bhurji 100 g + 250 ml milk', kcal: 420, protein: 26, g: 'paneer:100,milk:250,veg:40' },
    ] },
    { id: 'dinner', label: 'Dinner', options: [
      { id: 'v-d1', name: '{c} + paneer/tofu sabzi 150 g + veg + curd', kcal: 750, protein: 38, carb: { unit: 'roti', qty: 3 }, g: 'paneer:150,veg:150,curd:150' },
      { id: 'v-d2', name: '{c} + 3-egg bhurji + sambar', kcal: 620, protein: 27, tag: 'S', egg: true, carb: { unit: 'dosa', qty: 3 }, g: 'eggs:3,toor:25,veg:80' },
      { id: 'v-d3', name: '{c} + rasam + 3-egg masala + beans poriyal', kcal: 650, protein: 25, tag: 'S', egg: true, carb: { unit: 'rice', qty: 1.5 }, g: 'eggs:3,toor:10,veg:150' },
      { id: 'v-d4', name: '{c} + soya keema (40 g dry) + salad', kcal: 650, protein: 38, tag: 'N', carb: { unit: 'roti', qty: 3 }, g: 'soya:40,salad:100,veg:50' },
    ] },
    { id: 'bed', label: 'Bedtime', options: [
      { id: 'v-n1', name: '250 ml warm milk + 4 walnut halves', kcal: 230, protein: 9, g: 'milk:250,walnuts:4' },
      { id: 'v-n2', name: '250 ml turmeric milk + 10 almonds', kcal: 220, protein: 10, g: 'milk:250,almonds:10' },
      { id: 'v-n3', name: 'Greek yogurt 150 g', kcal: 130, protein: 15, g: 'gy:150' },
    ] },
  ],
  tips: [
    'A small, steady surplus builds muscle with less fat — that’s why the target is only about +300 kcal.',
    'Protein is spread across the day so every meal feeds recovery.',
    'Carbs sit around training to fuel the session and refill afterwards.',
  ],
}
