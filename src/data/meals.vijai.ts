import type { MealPlan } from './meals.types'

/**
 * VIJAI — fat-loss meal pools, built around what he already eats:
 * oats + egg whites in the morning, chapathi + boiled chicken + carrot & beans at noon,
 * chicken + egg whites at night, black coffee in between.
 * Chicken / fish weights are RAW weights (200 g raw ≈ 240 kcal, 46 g protein).
 * Only the carb portions ({c}) scale to hit the daily calorie target; protein stays fixed.
 */
export const vijaiMeals: MealPlan = {
  slots: [
    { id: 'early', label: 'Early morning', options: [
      { id: 'j-e1', name: 'Black coffee, no sugar + 500 ml water', kcal: 5, protein: 0, g: '' },
      { id: 'j-e2', name: 'Black coffee + 6 soaked almonds', kcal: 45, protein: 2, g: 'almonds:6' },
    ] },
    { id: 'breakfast', label: 'Breakfast', options: [
      { id: 'j-b1', name: '{c} in water + 3 boiled egg whites + 1 whole egg', kcal: 310, protein: 25, egg: true, carb: { unit: 'oats', qty: 50, min: 30, max: 70 }, g: 'eggs:4' },
      { id: 'j-b2', name: '{c} in 200 ml toned milk + 3 boiled egg whites', kcal: 360, protein: 24, egg: true, carb: { unit: 'oats', qty: 50, min: 30, max: 70 }, g: 'milk:200,eggs:3' },
      { id: 'j-b3', name: '{c} + sambar + 4 egg-white omelette', kcal: 370, protein: 25, tag: 'S', egg: true, carb: { unit: 'idli', qty: 3, min: 2, max: 5 }, g: 'eggs:4,toor:20,veg:60' },
      { id: 'j-b4', name: 'Egg bhurji (1 egg + 4 whites) + {c}', kcal: 380, protein: 28, tag: 'N', egg: true, carb: { unit: 'roti', qty: 2, min: 1, max: 3 }, g: 'eggs:5,veg:40' },
    ] },
    { id: 'mid', label: 'Mid-morning', options: [
      { id: 'j-m1', name: 'Black coffee + 1 apple or guava', kcal: 85, protein: 1, g: 'fruit:1' },
      { id: 'j-m2', name: 'Greek yogurt 150 g + 1 fruit', kcal: 200, protein: 16, g: 'gy:150,fruit:1' },
      { id: 'j-m3', name: 'Buttermilk + 3 boiled egg whites', kcal: 90, protein: 13, egg: true, g: 'buttermilk:1,eggs:3' },
      { id: 'j-m4', name: 'Sprouts chaat 1 cup + black coffee', kcal: 120, protein: 9, g: 'moong:40,salad:50' },
    ] },
    { id: 'lunch', label: 'Lunch', options: [
      { id: 'j-l1', name: '{c} + 200 g boiled chicken + 200 g carrot & beans + curd', kcal: 590, protein: 60, meat: true, carb: { unit: 'roti', qty: 2, min: 1, max: 4 }, g: 'chicken:200,veg:200,curd:150' },
      { id: 'j-l2', name: '{c} + chicken curry 200 g (1 tsp oil) + beans poriyal + rasam', kcal: 600, protein: 53, tag: 'S', meat: true, carb: { unit: 'rice', qty: 1, min: 0.5, max: 1.5 }, g: 'chicken:200,veg:150,toor:10' },
      { id: 'j-l3', name: '{c} + fish curry 200 g + carrot & beans + curd', kcal: 600, protein: 55, meat: true, carb: { unit: 'roti', qty: 2, min: 1, max: 4 }, g: 'fish:200,veg:150,curd:150' },
      { id: 'j-l4', name: '{c} + tandoori chicken 200 g + dal + salad', kcal: 620, protein: 57, tag: 'N', meat: true, carb: { unit: 'roti', qty: 2, min: 1, max: 4 }, g: 'chicken:200,toor:30,salad:100,curd:50' },
      { id: 'j-l5', name: '{c} + egg curry (2 eggs + 4 whites) + dal + poriyal', kcal: 590, protein: 38, tag: 'S', egg: true, carb: { unit: 'rice', qty: 1, min: 0.5, max: 1.5 }, g: 'eggs:6,toor:30,veg:150' },
    ] },
    { id: 'pre', label: 'Pre-workout', options: [
      { id: 'j-p1', name: '1 banana + black coffee', kcal: 110, protein: 1, g: 'banana:1' },
      { id: 'j-p2', name: '3 dates + black coffee', kcal: 75, protein: 1, g: 'dates:3' },
    ] },
    { id: 'post', label: 'Post-workout', options: [
      { id: 'j-w1', name: 'Whey (1 scoop) in water', kcal: 120, protein: 24, whey: 1, g: 'whey:1' },
      { id: 'j-w2', name: '4 boiled egg whites + 1 fruit', kcal: 150, protein: 15, egg: true, g: 'eggs:4,fruit:1' },
    ] },
    { id: 'dinner', label: 'Dinner', options: [
      { id: 'j-d1', name: '200 g boiled chicken + 3 egg whites + 200 g veg + {c}', kcal: 455, protein: 63, meat: true, carb: { unit: 'roti', qty: 1, min: 0, max: 3 }, g: 'chicken:200,eggs:3,veg:200' },
      { id: 'j-d2', name: 'Grilled fish 200 g + 3 egg whites + sautéed veg + {c}', kcal: 470, protein: 60, meat: true, carb: { unit: 'roti', qty: 1, min: 0, max: 3 }, g: 'fish:200,eggs:3,veg:200' },
      { id: 'j-d3', name: 'Chicken salad bowl 200 g + 3 egg whites + {c}', kcal: 450, protein: 60, tag: 'N', meat: true, carb: { unit: 'roti', qty: 1, min: 0, max: 3 }, g: 'chicken:200,eggs:3,salad:150' },
      { id: 'j-d4', name: '{c} + chicken 150 g pepper fry + rasam + poriyal', kcal: 480, protein: 42, tag: 'S', meat: true, carb: { unit: 'dosa', qty: 2, min: 1, max: 3 }, g: 'chicken:150,veg:150' },
    ] },
    { id: 'bed', label: 'Bedtime', optional: true, options: [
      { id: 'j-n1', name: '200 ml warm toned milk + turmeric', kcal: 115, protein: 6, g: 'milk:200' },
      { id: 'j-n2', name: 'Greek yogurt 150 g', kcal: 120, protein: 15, g: 'gy:150' },
    ] },
  ],
  tips: [
    'Your old plan was about 1,000 kcal a day. That is too low for 86 kg and 5 gym days: you would lose muscle and stall. This plan keeps your foods and lands near 2,000 kcal.',
    'Weigh chicken and fish raw. 200 g raw boiled chicken ≈ 240 kcal and 46 g protein.',
    'Chapathi, oats, rice and dosa are the dials: the app scales them up or down to hit your daily target.',
    'Aim for 160–170 g protein daily. Most days you’ll go over, which is fine while cutting.',
    'Use 1 tsp oil per curry. Oil is where hidden calories sneak in.',
    'Black coffee in between is great. Keep sugar, juice and fried snacks out on weekdays; plan one relaxed meal a week.',
  ],
}
