import type { MealPlan } from './meals.types'

/** VARSHA meal pools (Section 8C). kcal / protein are the coach's base-portion numbers. */
export const varshaMeals: MealPlan = {
  slots: [
    { id: 'early', label: 'Early morning', optional: true, options: [
      { id: 'r-e1', name: 'Warm water + soaked methi seeds', kcal: 0, protein: 0, g: '' },
      { id: 'r-e2', name: 'Green tea + 1 tsp soaked chia', kcal: 30, protein: 1, g: 'chia:1' },
      { id: 'r-e3', name: 'Black coffee', kcal: 0, protein: 0, g: '' },
    ] },
    { id: 'breakfast', label: 'Breakfast', options: [
      { id: 'r-b1', name: '2 moong dal chilla + veg + mint chutney + 100 g curd', kcal: 360, protein: 22, g: 'moong:70,veg:60,curd:100' },
      { id: 'r-b2', name: '3 egg whites + 1 whole egg omelette with veg + 1 wheat toast', kcal: 210, protein: 19, egg: true, g: 'eggs:4,veg:50,bread:1' },
      { id: 'r-b3', name: '{c} + sambar + 1 boiled egg', kcal: 330, protein: 14, tag: 'S', egg: true, carb: { unit: 'idli', qty: 3 }, g: 'toor:25,veg:80,eggs:1' },
      { id: 'r-b4', name: '2 pesarattu + chutney', kcal: 300, protein: 16, tag: 'S', g: 'moong:70' },
      { id: 'r-b5', name: 'Overnight oats: {c} + 150 ml milk + 100 g Greek yogurt + berries', kcal: 320, protein: 20, carb: { unit: 'oats', qty: 30 }, g: 'milk:150,gy:100,berries:50' },
      { id: 'r-b6', name: 'Paneer bhurji 80 g + {c}', kcal: 310, protein: 18, tag: 'N', carb: { unit: 'roti', qty: 1, max: 2 }, g: 'paneer:80,veg:40' },
    ] },
    { id: 'mid', label: 'Mid-morning', options: [
      { id: 'r-m1', name: '1 fruit + 100 g Greek yogurt', kcal: 150, protein: 10, g: 'fruit:1,gy:100' },
      { id: 'r-m2', name: 'Sprouts chaat 1 cup', kcal: 120, protein: 8, g: 'moong:40,salad:40' },
      { id: 'r-m3', name: 'Buttermilk + 5 almonds', kcal: 80, protein: 4, g: 'buttermilk:1,almonds:5' },
    ] },
    { id: 'lunch', label: 'Lunch', options: [
      { id: 'r-l1', name: '{c} + dal + paneer 100 g or soya 30 g dry + salad + curd', kcal: 600, protein: 35, tag: 'N', carb: { unit: 'roti', qty: 2, min: 1, max: 2 }, g: 'toor:30,paneer:100,salad:100,curd:100' },
      { id: 'r-l2', name: '{c} + sambar + 2-egg curry + poriyal', kcal: 520, protein: 22, tag: 'S', egg: true, carb: { unit: 'rice', qty: 0.75, min: 0.5, max: 1 }, g: 'toor:25,eggs:2,veg:180' },
      { id: 'r-l3', name: '{c} (kodo/little millet) + rajma + salad', kcal: 450, protein: 18, carb: { unit: 'millet', qty: 0.75, min: 0.5, max: 1 }, g: 'rajma:45,salad:100' },
      { id: 'r-l4', name: 'Small curd rice ({c}) + soya curry (30 g dry)', kcal: 500, protein: 25, tag: 'S', carb: { unit: 'rice', qty: 0.75, min: 0.5, max: 1 }, g: 'curd:120,soya:30,veg:60' },
    ] },
    { id: 'evening', label: 'Evening', options: [
      { id: 'r-v1', name: 'Roasted chana 30 g + green tea', kcal: 115, protein: 6, g: 'rchana:30' },
      { id: 'r-v2', name: 'Greek yogurt 150 g + berries', kcal: 150, protein: 15, g: 'gy:150,berries:50' },
      { id: 'r-v3', name: '2 boiled eggs', kcal: 145, protein: 12, egg: true, g: 'eggs:2' },
      { id: 'r-v4', name: 'Roasted makhana 25 g + buttermilk', kcal: 130, protein: 5, g: 'makhana:25,buttermilk:1' },
    ] },
    { id: 'post', label: 'Post-workout', options: [
      { id: 'r-w1', name: 'Full scoop of whey in water', kcal: 120, protein: 24, whey: 1, g: 'whey:1' },
      { id: 'r-w2', name: 'Paneer bhurji 70 g', kcal: 190, protein: 13, g: 'paneer:70,veg:30' },
      { id: 'r-w3', name: '3 egg whites + 1 egg', kcal: 120, protein: 17, egg: true, g: 'eggs:4' },
    ] },
    { id: 'dinner', label: 'Dinner', options: [
      { id: 'r-d1', name: 'Veg soup + grilled paneer 100 g + salad', kcal: 380, protein: 22, g: 'veg:150,paneer:100,salad:100' },
      { id: 'r-d2', name: 'Tofu stir-fry 150 g + veg + soup', kcal: 300, protein: 20, g: 'tofu:150,veg:200' },
      { id: 'r-d3', name: '{c} + 2-egg bhurji', kcal: 380, protein: 18, tag: 'S', egg: true, carb: { unit: 'ragi-dosa', qty: 2, max: 3 }, g: 'eggs:2,veg:40' },
      { id: 'r-d4', name: 'Moong dal + {c} + sautéed veg', kcal: 350, protein: 18, carb: { unit: 'roti', qty: 1, max: 2 }, g: 'toor:40,veg:150' },
      { id: 'r-d5', name: 'Soya keema (30 g dry) + {c} + salad', kcal: 320, protein: 22, tag: 'N', carb: { unit: 'roti', qty: 1, max: 2 }, g: 'soya:30,salad:100,veg:40' },
    ] },
    { id: 'bed', label: 'Bedtime', optional: true, options: [
      { id: 'r-n1', name: 'Herbal tea + 15 g pumpkin seeds', kcal: 85, protein: 4.5, g: 'pumpkin:15' },
      { id: 'r-n2', name: '150 ml warm milk', kcal: 90, protein: 5, g: 'milk:150' },
    ] },
  ],
  tips: [
    'Avoid fried snacks and added sugar.',
    'Keep the bigger rice portions earlier in the day — a preference; the calories are what matter.',
    'Protein at every meal keeps you full and protects strength while you train.',
    'A light, protein-forward dinner makes the day’s numbers easy to hit.',
  ],
}
