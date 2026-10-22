/**
 * Builds src/lib/foodCatalogExtra.js — a large offline catalog expansion.
 * Nutrition values are typical label / published-menu approximations.
 *
 * Run: node scripts/generate-food-catalog-extra.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { addWave2 } from './food-catalog-wave2.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const foods = [];
const seen = new Set();

function add(row) {
  if (seen.has(row.id)) throw new Error(`dup id ${row.id}`);
  for (const key of ['calories', 'protein', 'carbs', 'fat']) {
    if (!Number.isFinite(row[key])) throw new Error(`bad ${key} on ${row.id}`);
  }
  seen.add(row.id);
  foods.push(row);
}

function chain(brand, slug, items) {
  for (const item of items) {
    add({
      id: `${slug}-${item.id}`,
      name: item.name,
      brand,
      serving: item.serving || '1 serving',
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      aliases: item.aliases || [brand.toLowerCase(), slug.replace(/-/g, ' ')],
    });
  }
}

function staple(id, name, brand, serving, calories, protein, carbs, fat, aliases) {
  add({
    id: `local2-${id}`,
    name,
    brand,
    serving,
    calories,
    protein,
    carbs,
    fat,
    ...(aliases ? { aliases } : {}),
  });
}

// —— Wendy's ——
chain("Wendy's", 'wendys', [
  { id: 'dave-single', name: "Dave's Single", serving: '1 sandwich', calories: 590, protein: 30, carbs: 40, fat: 34, aliases: ["wendys", "dave's single"] },
  { id: 'dave-double', name: "Dave's Double", serving: '1 sandwich', calories: 860, protein: 51, carbs: 41, fat: 54 },
  { id: 'dave-triple', name: "Dave's Triple", serving: '1 sandwich', calories: 1160, protein: 71, carbs: 42, fat: 75 },
  { id: 'jr-cheeseburger', name: 'Jr. Cheeseburger', serving: '1 sandwich', calories: 290, protein: 15, carbs: 26, fat: 14 },
  { id: 'jr-bacon', name: 'Jr. Bacon Cheeseburger', serving: '1 sandwich', calories: 390, protein: 20, carbs: 27, fat: 23 },
  { id: 'baconator', name: 'Baconator', serving: '1 sandwich', calories: 960, protein: 59, carbs: 38, fat: 65, aliases: ['wendys', 'baconator'] },
  { id: 'spicy-chicken', name: 'Spicy Chicken Sandwich', serving: '1 sandwich', calories: 500, protein: 30, carbs: 45, fat: 21 },
  { id: 'classic-chicken', name: 'Classic Chicken Sandwich', serving: '1 sandwich', calories: 490, protein: 29, carbs: 45, fat: 20 },
  { id: 'nuggets-6', name: 'Chicken Nuggets', serving: '6 pieces', calories: 270, protein: 14, carbs: 15, fat: 17 },
  { id: 'nuggets-10', name: 'Chicken Nuggets', serving: '10 pieces', calories: 450, protein: 23, carbs: 25, fat: 29 },
  { id: 'fries-med', name: 'French Fries', serving: 'medium', calories: 350, protein: 4, carbs: 46, fat: 16 },
  { id: 'fries-large', name: 'French Fries', serving: 'large', calories: 480, protein: 6, carbs: 64, fat: 22 },
  { id: 'chili-small', name: 'Chili', serving: 'small', calories: 250, protein: 16, carbs: 22, fat: 10, aliases: ['wendys', 'wendys chili'] },
  { id: 'chili-large', name: 'Chili', serving: 'large', calories: 340, protein: 22, carbs: 31, fat: 14 },
  { id: 'frosty-small', name: 'Chocolate Frosty', serving: 'small', calories: 350, protein: 9, carbs: 58, fat: 9, aliases: ['wendys', 'frosty'] },
  { id: 'frosty-med', name: 'Chocolate Frosty', serving: 'medium', calories: 470, protein: 12, carbs: 78, fat: 12 },
  { id: 'apple-pecan', name: 'Apple Pecan Chicken Salad', serving: '1 salad', calories: 560, protein: 36, carbs: 49, fat: 26 },
  { id: 'caesar', name: 'Parmesan Caesar Salad', serving: '1 salad', calories: 440, protein: 33, carbs: 15, fat: 28 },
  { id: 'baked-potato', name: 'Baked Potato, plain', serving: '1 potato', calories: 270, protein: 7, carbs: 61, fat: 0 },
  { id: 'sour-cream-chive', name: 'Baked Potato Sour Cream & Chives', serving: '1 potato', calories: 320, protein: 8, carbs: 63, fat: 4 },
]);

// —— Burger King ——
chain('Burger King', 'bk', [
  { id: 'whopper', name: 'Whopper', serving: '1 sandwich', calories: 670, protein: 31, carbs: 49, fat: 39, aliases: ['burger king', 'whopper', 'bk'] },
  { id: 'whopper-cheese', name: 'Whopper with Cheese', serving: '1 sandwich', calories: 750, protein: 35, carbs: 50, fat: 45 },
  { id: 'double-whopper', name: 'Double Whopper', serving: '1 sandwich', calories: 900, protein: 48, carbs: 49, fat: 58 },
  { id: 'whopper-jr', name: 'Whopper Jr.', serving: '1 sandwich', calories: 330, protein: 15, carbs: 28, fat: 19 },
  { id: 'bacon-king', name: 'Bacon King', serving: '1 sandwich', calories: 1150, protein: 62, carbs: 49, fat: 79 },
  { id: 'chicken-jr', name: 'Chicken Jr.', serving: '1 sandwich', calories: 380, protein: 13, carbs: 31, fat: 23 },
  { id: 'crispy-chicken', name: 'Crispy Chicken Sandwich', serving: '1 sandwich', calories: 670, protein: 25, carbs: 55, fat: 39 },
  { id: 'spicy-chicken', name: 'Spicy Crispy Chicken Sandwich', serving: '1 sandwich', calories: 700, protein: 25, carbs: 57, fat: 41 },
  { id: 'nuggets-8', name: 'Chicken Nuggets', serving: '8 pieces', calories: 380, protein: 18, carbs: 24, fat: 24 },
  { id: 'nuggets-10', name: 'Chicken Nuggets', serving: '10 pieces', calories: 470, protein: 22, carbs: 30, fat: 30 },
  { id: 'fries-med', name: 'French Fries', serving: 'medium', calories: 370, protein: 4, carbs: 48, fat: 16 },
  { id: 'fries-large', name: 'French Fries', serving: 'large', calories: 440, protein: 5, carbs: 57, fat: 19 },
  { id: 'onion-rings', name: 'Onion Rings', serving: 'medium', calories: 410, protein: 5, carbs: 50, fat: 21 },
  { id: 'chicken-fries', name: 'Chicken Fries', serving: '9 pieces', calories: 280, protein: 13, carbs: 20, fat: 17, aliases: ['burger king', 'chicken fries', 'bk'] },
  { id: 'impossible', name: 'Impossible Whopper', serving: '1 sandwich', calories: 630, protein: 28, carbs: 58, fat: 34 },
  { id: 'sausage-biscuit', name: 'Sausage Biscuit', serving: '1 sandwich', calories: 400, protein: 11, carbs: 30, fat: 27 },
  { id: 'croissanwich', name: "Sausage, Egg & Cheese Croissan'wich", serving: '1 sandwich', calories: 500, protein: 19, carbs: 30, fat: 33 },
  { id: 'hash-browns', name: 'Hash Browns', serving: 'small', calories: 250, protein: 2, carbs: 23, fat: 16 },
]);

// —— Popeyes ——
chain('Popeyes', 'popeyes', [
  { id: 'chicken-sandwich', name: 'Chicken Sandwich', serving: '1 sandwich', calories: 700, protein: 28, carbs: 50, fat: 42, aliases: ['popeyes', 'popeyes sandwich'] },
  { id: 'spicy-sandwich', name: 'Spicy Chicken Sandwich', serving: '1 sandwich', calories: 700, protein: 28, carbs: 50, fat: 42 },
  { id: 'blackened-sandwich', name: 'Blackened Chicken Sandwich', serving: '1 sandwich', calories: 540, protein: 32, carbs: 45, fat: 26 },
  { id: 'tenders-3', name: 'Chicken Tenders', serving: '3 pieces', calories: 430, protein: 32, carbs: 19, fat: 26 },
  { id: 'tenders-5', name: 'Chicken Tenders', serving: '5 pieces', calories: 720, protein: 53, carbs: 32, fat: 43 },
  { id: 'wing-classic', name: 'Classic Wing', serving: '1 wing', calories: 210, protein: 13, carbs: 8, fat: 14 },
  { id: 'leg', name: 'Chicken Leg', serving: '1 piece', calories: 180, protein: 15, carbs: 6, fat: 11 },
  { id: 'thigh', name: 'Chicken Thigh', serving: '1 piece', calories: 280, protein: 18, carbs: 8, fat: 20 },
  { id: 'breast', name: 'Chicken Breast', serving: '1 piece', calories: 380, protein: 35, carbs: 13, fat: 22 },
  { id: 'biscuit', name: 'Buttermilk Biscuit', serving: '1 biscuit', calories: 210, protein: 4, carbs: 25, fat: 11 },
  { id: 'cajun-fries', name: 'Cajun Fries', serving: 'regular', calories: 280, protein: 4, carbs: 36, fat: 13 },
  { id: 'cajun-fries-large', name: 'Cajun Fries', serving: 'large', calories: 460, protein: 6, carbs: 59, fat: 21 },
  { id: 'red-beans', name: 'Red Beans & Rice', serving: 'regular', calories: 270, protein: 9, carbs: 38, fat: 10 },
  { id: 'mashed', name: 'Mashed Potatoes with Cajun Gravy', serving: 'regular', calories: 120, protein: 2, carbs: 18, fat: 4.5 },
  { id: 'coleslaw', name: 'Coleslaw', serving: 'regular', calories: 220, protein: 1, carbs: 18, fat: 16 },
  { id: 'mac', name: 'Mac & Cheese', serving: 'regular', calories: 220, protein: 8, carbs: 19, fat: 12 },
]);

// —— KFC ——
chain('KFC', 'kfc', [
  { id: 'original-breast', name: 'Original Recipe Chicken Breast', serving: '1 piece', calories: 390, protein: 39, carbs: 11, fat: 21 },
  { id: 'original-thigh', name: 'Original Recipe Chicken Thigh', serving: '1 piece', calories: 280, protein: 19, carbs: 8, fat: 19 },
  { id: 'original-drum', name: 'Original Recipe Chicken Drumstick', serving: '1 piece', calories: 130, protein: 13, carbs: 3, fat: 7 },
  { id: 'original-wing', name: 'Original Recipe Chicken Wing', serving: '1 piece', calories: 130, protein: 9, carbs: 4, fat: 9 },
  { id: 'extra-crispy-breast', name: 'Extra Crispy Chicken Breast', serving: '1 piece', calories: 490, protein: 36, carbs: 19, fat: 30 },
  { id: 'sandwich', name: 'Chicken Sandwich', serving: '1 sandwich', calories: 650, protein: 30, carbs: 49, fat: 36 },
  { id: 'spicy-sandwich', name: 'Spicy Chicken Sandwich', serving: '1 sandwich', calories: 640, protein: 30, carbs: 49, fat: 36 },
  { id: 'tenders-3', name: 'Extra Crispy Tenders', serving: '3 pieces', calories: 390, protein: 27, carbs: 19, fat: 22 },
  { id: 'potato-wedges', name: 'Potato Wedges', serving: '1 serving', calories: 290, protein: 4, carbs: 35, fat: 15 },
  { id: 'mashed', name: 'Mashed Potatoes with Gravy', serving: '1 side', calories: 130, protein: 2, carbs: 18, fat: 5 },
  { id: 'coleslaw', name: 'Coleslaw', serving: '1 side', calories: 170, protein: 1, carbs: 15, fat: 12 },
  { id: 'biscuit', name: 'Biscuit', serving: '1 biscuit', calories: 180, protein: 4, carbs: 22, fat: 8 },
  { id: 'mac', name: 'Mac & Cheese', serving: '1 side', calories: 140, protein: 5, carbs: 16, fat: 6 },
  { id: 'famous-bowl', name: 'Famous Bowl', serving: '1 bowl', calories: 560, protein: 22, carbs: 64, fat: 24, aliases: ['kfc', 'famous bowl'] },
  { id: 'pot-pie', name: 'Chicken Pot Pie', serving: '1 pie', calories: 720, protein: 25, carbs: 62, fat: 41 },
]);

// —— Panda Express ——
chain('Panda Express', 'panda', [
  { id: 'orange-chicken', name: 'Orange Chicken', serving: '1 entree (5.7 oz)', calories: 490, protein: 25, carbs: 51, fat: 23, aliases: ['panda', 'panda express', 'orange chicken'] },
  { id: 'beijing-beef', name: 'Beijing Beef', serving: '1 entree', calories: 480, protein: 20, carbs: 46, fat: 27 },
  { id: 'broccoli-beef', name: 'Broccoli Beef', serving: '1 entree', calories: 150, protein: 13, carbs: 13, fat: 7 },
  { id: 'kung-pao', name: 'Kung Pao Chicken', serving: '1 entree', calories: 290, protein: 16, carbs: 14, fat: 19 },
  { id: 'mushroom-chicken', name: 'Mushroom Chicken', serving: '1 entree', calories: 220, protein: 14, carbs: 10, fat: 14 },
  { id: 'string-bean', name: 'String Bean Chicken Breast', serving: '1 entree', calories: 210, protein: 14, carbs: 13, fat: 12 },
  { id: 'teriyaki', name: 'Grilled Teriyaki Chicken', serving: '1 entree', calories: 300, protein: 36, carbs: 8, fat: 13 },
  { id: 'honey-walnut', name: 'Honey Walnut Shrimp', serving: '1 entree', calories: 360, protein: 12, carbs: 35, fat: 19 },
  { id: 'black-pepper', name: 'Black Pepper Angus Steak', serving: '1 entree', calories: 210, protein: 14, carbs: 13, fat: 11 },
  { id: 'sweetfire', name: 'SweetFire Chicken Breast', serving: '1 entree', calories: 360, protein: 15, carbs: 43, fat: 15 },
  { id: 'chow-mein', name: 'Chow Mein', serving: '1 side', calories: 510, protein: 13, carbs: 80, fat: 20 },
  { id: 'fried-rice', name: 'Fried Rice', serving: '1 side', calories: 520, protein: 11, carbs: 85, fat: 16 },
  { id: 'white-rice', name: 'Steamed White Rice', serving: '1 side', calories: 380, protein: 7, carbs: 87, fat: 0 },
  { id: 'brown-rice', name: 'Steamed Brown Rice', serving: '1 side', calories: 420, protein: 9, carbs: 86, fat: 4 },
  { id: 'super-greens', name: 'Super Greens', serving: '1 side', calories: 90, protein: 6, carbs: 10, fat: 3 },
  { id: 'egg-roll', name: 'Chicken Egg Roll', serving: '1 roll', calories: 200, protein: 6, carbs: 20, fat: 10 },
  { id: 'cream-cheese-rangoons', name: 'Cream Cheese Rangoon', serving: '3 pieces', calories: 190, protein: 5, carbs: 24, fat: 9 },
  { id: 'plate-orange-chow', name: 'Plate: Orange Chicken + Chow Mein', serving: '1 plate', calories: 1000, protein: 38, carbs: 131, fat: 43 },
]);

// —— Domino's ——
chain("Domino's", 'dominos', [
  { id: 'hand-toss-cheese', name: 'Hand Tossed Cheese Pizza', serving: '1 slice (med 12")', calories: 220, protein: 9, carbs: 28, fat: 8, aliases: ['dominos', "domino's"] },
  { id: 'hand-toss-pep', name: 'Hand Tossed Pepperoni Pizza', serving: '1 slice (med 12")', calories: 250, protein: 10, carbs: 28, fat: 10 },
  { id: 'hand-toss-meat', name: 'Hand Tossed MeatZZa Pizza', serving: '1 slice (med 12")', calories: 290, protein: 13, carbs: 28, fat: 14 },
  { id: 'pan-cheese', name: 'Handmade Pan Cheese Pizza', serving: '1 slice (med)', calories: 300, protein: 11, carbs: 31, fat: 14 },
  { id: 'thin-cheese', name: 'Crunchy Thin Crust Cheese', serving: '1 slice (med)', calories: 190, protein: 8, carbs: 18, fat: 10 },
  { id: 'brooklyn-pep', name: 'Brooklyn Style Pepperoni', serving: '1 slice (large)', calories: 320, protein: 13, carbs: 33, fat: 15 },
  { id: 'philly', name: 'Philly Cheese Steak Pizza', serving: '1 slice (med)', calories: 260, protein: 12, carbs: 28, fat: 11 },
  { id: 'buffalo-chicken', name: 'Buffalo Chicken Pizza', serving: '1 slice (med)', calories: 250, protein: 12, carbs: 28, fat: 10 },
  { id: 'bread-bites', name: 'Parmesan Bread Bites', serving: '16 pieces', calories: 570, protein: 18, carbs: 72, fat: 22 },
  { id: 'stuffed-cheesy', name: 'Stuffed Cheesy Bread', serving: '1 order (8 pcs)', calories: 880, protein: 36, carbs: 86, fat: 42 },
  { id: 'chicken-wings', name: 'Hot Chicken Wings', serving: '8 pieces', calories: 520, protein: 48, carbs: 4, fat: 36 },
  { id: 'boneless', name: 'Boneless Chicken', serving: '8 pieces', calories: 640, protein: 36, carbs: 40, fat: 36 },
  { id: 'pasta-chicken', name: 'Chicken Alfredo Pasta', serving: '1 bowl', calories: 730, protein: 33, carbs: 64, fat: 37 },
  { id: 'pasta-italian', name: 'Italian Sausage Marinara Pasta', serving: '1 bowl', calories: 750, protein: 28, carbs: 72, fat: 37 },
  { id: 'sandwich', name: 'Oven-Baked Chicken Bacon Ranch Sandwich', serving: '1 sandwich', calories: 740, protein: 39, carbs: 58, fat: 38 },
]);

// —— Pizza Hut ——
chain('Pizza Hut', 'pizzahut', [
  { id: 'pan-cheese', name: 'Pan Pizza Cheese', serving: '1 slice (med)', calories: 280, protein: 11, carbs: 28, fat: 13 },
  { id: 'pan-pep', name: 'Pan Pizza Pepperoni', serving: '1 slice (med)', calories: 300, protein: 12, carbs: 28, fat: 15 },
  { id: 'hand-toss-cheese', name: 'Hand Tossed Cheese', serving: '1 slice (med)', calories: 230, protein: 10, carbs: 28, fat: 8 },
  { id: 'thin-n-crispy', name: "Thin 'N Crispy Pepperoni", serving: '1 slice (med)', calories: 210, protein: 9, carbs: 21, fat: 10 },
  { id: 'stuffed-crust', name: 'Stuffed Crust Pepperoni', serving: '1 slice (large)', calories: 400, protein: 17, carbs: 38, fat: 19 },
  { id: 'meat-lovers', name: "Meat Lover's Pizza", serving: '1 slice (med pan)', calories: 370, protein: 15, carbs: 28, fat: 22 },
  { id: 'supreme', name: 'Supreme Pizza', serving: '1 slice (med pan)', calories: 320, protein: 12, carbs: 30, fat: 16 },
  { id: 'wings', name: 'Traditional Wings', serving: '2 wings', calories: 160, protein: 14, carbs: 1, fat: 11 },
  { id: 'breadsticks', name: 'Breadsticks', serving: '1 stick', calories: 140, protein: 4, carbs: 20, fat: 5 },
  { id: 'cheese-sticks', name: 'Cheese Sticks', serving: '1 stick', calories: 160, protein: 6, carbs: 18, fat: 7 },
  { id: 'marinara', name: 'Marinara Dipping Sauce', serving: '1 cup', calories: 40, protein: 1, carbs: 7, fat: 1 },
]);

// —— Panera ——
chain('Panera', 'panera', [
  { id: 'broccoli-cheddar', name: 'Broccoli Cheddar Soup', serving: 'bowl', calories: 360, protein: 14, carbs: 26, fat: 22, aliases: ['panera', 'broccoli cheddar'] },
  { id: 'broccoli-cheddar-bread', name: 'Broccoli Cheddar Soup in Bread Bowl', serving: '1 bread bowl', calories: 900, protein: 32, carbs: 106, fat: 38 },
  { id: 'chicken-noodle', name: 'Homestyle Chicken Noodle Soup', serving: 'bowl', calories: 150, protein: 12, carbs: 17, fat: 3.5 },
  { id: 'tomato-soup', name: 'Creamy Tomato Soup', serving: 'bowl', calories: 300, protein: 6, carbs: 36, fat: 14 },
  { id: 'turkey-sandwich', name: 'Turkey Sandwich', serving: '1 sandwich', calories: 560, protein: 38, carbs: 62, fat: 16 },
  { id: 'chipotle-chicken', name: 'Chipotle Chicken Avocado Melt', serving: '1 sandwich', calories: 770, protein: 45, carbs: 66, fat: 35 },
  { id: 'baja-bowl', name: 'Baja Grain Bowl', serving: '1 bowl', calories: 690, protein: 29, carbs: 82, fat: 28 },
  { id: 'green-goddess', name: 'Green Goddess Cobb Salad with Chicken', serving: '1 salad', calories: 530, protein: 41, carbs: 20, fat: 33 },
  { id: 'caesar', name: 'Caesar Salad with Chicken', serving: '1 salad', calories: 510, protein: 37, carbs: 23, fat: 30 },
  { id: 'fuji-apple', name: 'Fuji Apple Salad with Chicken', serving: '1 salad', calories: 560, protein: 32, carbs: 46, fat: 28 },
  { id: 'mac', name: 'Mac & Cheese', serving: 'bowl', calories: 480, protein: 21, carbs: 41, fat: 25 },
  { id: 'bagel-asiago', name: 'Asiago Cheese Bagel', serving: '1 bagel', calories: 320, protein: 13, carbs: 56, fat: 5 },
  { id: 'bagel-everything', name: 'Everything Bagel', serving: '1 bagel', calories: 290, protein: 10, carbs: 57, fat: 2.5 },
  { id: 'cinnamon-crunch', name: 'Cinnamon Crunch Bagel', serving: '1 bagel', calories: 420, protein: 10, carbs: 79, fat: 7 },
  { id: 'chai', name: 'Chai Tea Latte', serving: '16 fl oz', calories: 260, protein: 9, carbs: 48, fat: 3.5 },
  { id: 'smoothie', name: 'Strawberry Banana Smoothie', serving: '16 fl oz', calories: 250, protein: 4, carbs: 56, fat: 1 },
]);

// —— Dunkin' ——
chain("Dunkin'", 'dunkin', [
  { id: 'original-glazed', name: 'Original Glazed Donut', serving: '1 donut', calories: 260, protein: 3, carbs: 31, fat: 14, aliases: ['dunkin', "dunkin'", 'donut'] },
  { id: 'boston-kreme', name: 'Boston Kreme Donut', serving: '1 donut', calories: 300, protein: 4, carbs: 39, fat: 15 },
  { id: 'chocolate-frosted', name: 'Chocolate Frosted Donut', serving: '1 donut', calories: 300, protein: 3, carbs: 36, fat: 16 },
  { id: 'bavarian', name: 'Bavarian Kreme Donut', serving: '1 donut', calories: 280, protein: 4, carbs: 35, fat: 14 },
  { id: 'muffin-blueberry', name: 'Blueberry Muffin', serving: '1 muffin', calories: 460, protein: 6, carbs: 74, fat: 16 },
  { id: 'muffin-coffee-cake', name: 'Coffee Cake Muffin', serving: '1 muffin', calories: 540, protein: 7, carbs: 76, fat: 24 },
  { id: 'bagel-plain', name: 'Plain Bagel', serving: '1 bagel', calories: 300, protein: 10, carbs: 61, fat: 1.5 },
  { id: 'bagel-everything', name: 'Everything Bagel', serving: '1 bagel', calories: 340, protein: 11, carbs: 65, fat: 3 },
  { id: 'wake-up', name: 'Wake-Up Wrap Egg & Cheese', serving: '1 wrap', calories: 180, protein: 7, carbs: 14, fat: 10 },
  { id: 'wake-up-bacon', name: 'Wake-Up Wrap Bacon Egg & Cheese', serving: '1 wrap', calories: 220, protein: 10, carbs: 14, fat: 13 },
  { id: 'sausage-croissant', name: 'Sausage Egg & Cheese Croissant', serving: '1 sandwich', calories: 650, protein: 22, carbs: 42, fat: 43 },
  { id: 'bacon-english', name: 'Bacon Egg & Cheese on English Muffin', serving: '1 sandwich', calories: 360, protein: 16, carbs: 33, fat: 17 },
  { id: 'coffee-med', name: 'Coffee with Cream & Sugar', serving: 'medium', calories: 120, protein: 1, carbs: 16, fat: 6 },
  { id: 'cold-brew', name: 'Cold Brew', serving: 'medium', calories: 5, protein: 0, carbs: 0, fat: 0 },
  { id: 'latte', name: 'Latte with Whole Milk', serving: 'medium', calories: 190, protein: 10, carbs: 16, fat: 9 },
  { id: 'macchiato', name: 'Caramel Macchiato', serving: 'medium', calories: 240, protein: 9, carbs: 37, fat: 6 },
  { id: 'frozen-coffee', name: 'Frozen Coffee with Cream', serving: 'medium', calories: 600, protein: 7, carbs: 108, fat: 16 },
  { id: 'hash-browns', name: 'Hash Browns', serving: '6 pieces', calories: 150, protein: 1, carbs: 14, fat: 10 },
]);

// —— Five Guys ——
chain('Five Guys', 'fiveguys', [
  { id: 'hamburger', name: 'Hamburger', serving: '1 sandwich', calories: 700, protein: 37, carbs: 39, fat: 43, aliases: ['five guys', 'fiveguys'] },
  { id: 'cheeseburger', name: 'Cheeseburger', serving: '1 sandwich', calories: 840, protein: 45, carbs: 40, fat: 55 },
  { id: 'bacon-burger', name: 'Bacon Burger', serving: '1 sandwich', calories: 780, protein: 43, carbs: 39, fat: 51 },
  { id: 'bacon-cheese', name: 'Bacon Cheeseburger', serving: '1 sandwich', calories: 920, protein: 51, carbs: 40, fat: 63 },
  { id: 'little-hamburger', name: 'Little Hamburger', serving: '1 sandwich', calories: 480, protein: 23, carbs: 39, fat: 26 },
  { id: 'little-cheese', name: 'Little Cheeseburger', serving: '1 sandwich', calories: 550, protein: 27, carbs: 39, fat: 32 },
  { id: 'hot-dog', name: 'Hot Dog', serving: '1 dog', calories: 520, protein: 20, carbs: 40, fat: 32 },
  { id: 'cheese-dog', name: 'Cheese Dog', serving: '1 dog', calories: 590, protein: 24, carbs: 40, fat: 39 },
  { id: 'fries-little', name: 'Little Fries', serving: '1 serving', calories: 530, protein: 8, carbs: 72, fat: 25 },
  { id: 'fries-regular', name: 'Regular Fries', serving: '1 serving', calories: 950, protein: 15, carbs: 131, fat: 41 },
  { id: 'fries-cajun', name: 'Cajun Fries', serving: 'regular', calories: 950, protein: 15, carbs: 131, fat: 41 },
  { id: 'milkshake', name: 'Milkshake, chocolate', serving: '1 regular', calories: 790, protein: 16, carbs: 99, fat: 36 },
]);

// —— Shake Shack ——
chain('Shake Shack', 'shakeshack', [
  { id: 'shackburger', name: 'ShackBurger', serving: 'single', calories: 520, protein: 28, carbs: 32, fat: 31, aliases: ['shake shack', 'shackburger'] },
  { id: 'shackburger-double', name: 'ShackBurger', serving: 'double', calories: 770, protein: 48, carbs: 33, fat: 49 },
  { id: 'smokehouse', name: 'SmokeShack', serving: 'single', calories: 590, protein: 32, carbs: 33, fat: 37 },
  { id: 'shack-stack', name: 'Shack Stack', serving: '1 sandwich', calories: 770, protein: 35, carbs: 45, fat: 49 },
  { id: 'chicken', name: 'Chicken Shack', serving: '1 sandwich', calories: 540, protein: 30, carbs: 43, fat: 27 },
  { id: 'chickn-bites', name: "Chick'n Bites", serving: '6 pieces', calories: 290, protein: 20, carbs: 15, fat: 17 },
  { id: 'fries', name: 'Crinkle Cut Fries', serving: '1 regular', calories: 420, protein: 5, carbs: 52, fat: 21 },
  { id: 'cheese-fries', name: 'Cheese Fries', serving: '1 regular', calories: 580, protein: 11, carbs: 54, fat: 35 },
  { id: 'shake-chocolate', name: 'Chocolate Shake', serving: '1 shake', calories: 680, protein: 16, carbs: 80, fat: 34 },
  { id: 'shake-vanilla', name: 'Vanilla Shake', serving: '1 shake', calories: 650, protein: 15, carbs: 76, fat: 33 },
  { id: 'concrete', name: 'Chocolate Concrete', serving: '1 regular', calories: 780, protein: 15, carbs: 95, fat: 39 },
]);

// —— Raising Cane's ——
chain("Raising Cane's", 'canes', [
  { id: 'box-combo', name: 'The Box Combo', serving: '1 combo', calories: 1280, protein: 54, carbs: 117, fat: 67, aliases: ["raising cane's", 'raising canes', 'canes', "cane's"] },
  { id: '3-finger', name: '3 Finger Combo', serving: '1 combo', calories: 1130, protein: 42, carbs: 113, fat: 57, aliases: ["raising cane's", 'raising canes', 'canes'] },
  { id: 'sandwich-combo', name: 'Caniac Sandwich Combo', serving: '1 combo', calories: 1310, protein: 45, carbs: 140, fat: 62, aliases: ["raising cane's", 'raising canes', 'canes'] },
  { id: 'fingers-3', name: 'Chicken Fingers', serving: '3 fingers', calories: 400, protein: 33, carbs: 16, fat: 23, aliases: ["raising cane's", 'raising canes', 'canes'] },
  { id: 'fingers-4', name: 'Chicken Fingers', serving: '4 fingers', calories: 530, protein: 44, carbs: 21, fat: 31, aliases: ["raising cane's", 'raising canes', 'canes'] },
  { id: 'fingers-6', name: 'Chicken Fingers', serving: '6 fingers', calories: 800, protein: 66, carbs: 32, fat: 46, aliases: ["raising cane's", 'raising canes', 'canes'] },
  { id: 'fries', name: 'Crinkle-Cut Fries', serving: '1 regular', calories: 350, protein: 4, carbs: 45, fat: 17, aliases: ["raising cane's", 'raising canes', 'canes'] },
  { id: 'texas-toast', name: 'Texas Toast', serving: '1 slice', calories: 150, protein: 3, carbs: 18, fat: 7, aliases: ["raising cane's", 'raising canes', 'canes'] },
  { id: 'coleslaw', name: 'Coleslaw', serving: '1 regular', calories: 150, protein: 1, carbs: 12, fat: 11, aliases: ["raising cane's", 'raising canes', 'canes'] },
  { id: 'sauce', name: "Cane's Sauce", serving: '1 cup', calories: 140, protein: 0, carbs: 6, fat: 13, aliases: ["raising cane's", 'raising canes', 'canes', "cane's sauce"] },
]);

// —— Wingstop ——
chain('Wingstop', 'wingstop', [
  { id: 'classic-wing', name: 'Classic Wing, plain', serving: '1 wing', calories: 110, protein: 9, carbs: 0, fat: 8 },
  { id: 'boneless', name: 'Boneless Wing, plain', serving: '1 piece', calories: 90, protein: 7, carbs: 6, fat: 5 },
  { id: 'louisiana-rub', name: 'Classic Wing Louisiana Rub', serving: '1 wing', calories: 110, protein: 9, carbs: 0, fat: 8 },
  { id: 'garlic-parm', name: 'Classic Wing Garlic Parmesan', serving: '1 wing', calories: 140, protein: 9, carbs: 1, fat: 11 },
  { id: 'lemon-pep', name: 'Classic Wing Lemon Pepper', serving: '1 wing', calories: 120, protein: 9, carbs: 0, fat: 9 },
  { id: 'atomic', name: 'Classic Wing Atomic', serving: '1 wing', calories: 110, protein: 9, carbs: 1, fat: 8 },
  { id: 'hawaiian', name: 'Classic Wing Hawaiian', serving: '1 wing', calories: 130, protein: 9, carbs: 5, fat: 8 },
  { id: 'mango-hab', name: 'Classic Wing Mango Habanero', serving: '1 wing', calories: 130, protein: 9, carbs: 5, fat: 8 },
  { id: 'fries', name: 'Seasoned Fries', serving: 'large', calories: 640, protein: 7, carbs: 78, fat: 33 },
  { id: 'fries-regular', name: 'Seasoned Fries', serving: 'regular', calories: 330, protein: 4, carbs: 40, fat: 17 },
  { id: 'cheese-fries', name: 'Cheese Fries', serving: 'large', calories: 920, protein: 19, carbs: 82, fat: 56 },
  { id: 'veggies', name: 'Veggie Sticks', serving: '1 serving', calories: 15, protein: 1, carbs: 3, fat: 0 },
  { id: 'ranch', name: 'Ranch Dip', serving: '1 cup', calories: 260, protein: 1, carbs: 3, fat: 27 },
  { id: 'blue-cheese', name: 'Blue Cheese Dip', serving: '1 cup', calories: 270, protein: 2, carbs: 2, fat: 28 },
]);

// —— Whataburger ——
chain('Whataburger', 'whataburger', [
  { id: 'whataburger', name: 'Whataburger', serving: '1 sandwich', calories: 590, protein: 29, carbs: 59, fat: 26, aliases: ['whataburger'] },
  { id: 'double-meat', name: 'Double Meat Whataburger', serving: '1 sandwich', calories: 790, protein: 47, carbs: 59, fat: 38 },
  { id: 'cheese', name: 'Whataburger with Cheese', serving: '1 sandwich', calories: 660, protein: 33, carbs: 60, fat: 31 },
  { id: 'avocado-bacon', name: 'Avocado Bacon Burger', serving: '1 sandwich', calories: 830, protein: 39, carbs: 61, fat: 47 },
  { id: 'honey-bbq', name: 'Honey BBQ Chicken Strip Sandwich', serving: '1 sandwich', calories: 700, protein: 31, carbs: 83, fat: 26 },
  { id: 'chicken-strips', name: 'Chicken Strips', serving: '3 strips', calories: 500, protein: 30, carbs: 33, fat: 28 },
  { id: 'fries-med', name: 'French Fries', serving: 'medium', calories: 400, protein: 4, carbs: 52, fat: 19 },
  { id: 'onion-rings', name: 'Onion Rings', serving: 'medium', calories: 450, protein: 6, carbs: 52, fat: 24 },
  { id: 'breakfast-on-bun', name: 'Breakfast on a Bun', serving: '1 sandwich', calories: 580, protein: 26, carbs: 43, fat: 32 },
  { id: 'taquito', name: 'Breakfast Taquito with Cheese', serving: '1 taquito', calories: 280, protein: 11, carbs: 20, fat: 17 },
  { id: 'honey-butter', name: 'Honey Butter Chicken Biscuit', serving: '1 sandwich', calories: 500, protein: 18, carbs: 49, fat: 26 },
  { id: 'shake', name: 'Chocolate Shake', serving: 'medium', calories: 740, protein: 14, carbs: 115, fat: 24 },
]);

// —— Sonic ——
chain('Sonic', 'sonic', [
  { id: 'cheeseburger', name: 'Cheeseburger', serving: '1 sandwich', calories: 650, protein: 30, carbs: 45, fat: 38 },
  { id: 'super-sonic', name: 'SuperSONIC Cheeseburger', serving: '1 sandwich', calories: 1050, protein: 51, carbs: 48, fat: 72 },
  { id: 'sonic-burger', name: 'Sonic Burger', serving: '1 sandwich', calories: 580, protein: 26, carbs: 44, fat: 33 },
  { id: 'chicken-sandwich', name: 'Crispy Chicken Sandwich', serving: '1 sandwich', calories: 630, protein: 26, carbs: 56, fat: 33 },
  { id: 'tots', name: 'Tots', serving: 'medium', calories: 400, protein: 4, carbs: 42, fat: 24, aliases: ['sonic', 'tater tots', 'tots'] },
  { id: 'fries', name: 'Fries', serving: 'medium', calories: 340, protein: 4, carbs: 45, fat: 15 },
  { id: 'onion-rings', name: 'Onion Rings', serving: 'medium', calories: 500, protein: 6, carbs: 56, fat: 28 },
  { id: 'ocean-water', name: 'Ocean Water', serving: 'medium', calories: 250, protein: 0, carbs: 64, fat: 0 },
  { id: 'route-44-coke', name: 'Coca-Cola', serving: 'Route 44', calories: 450, protein: 0, carbs: 120, fat: 0 },
  { id: 'blast', name: 'Oreo Blast', serving: 'medium', calories: 750, protein: 11, carbs: 104, fat: 32, aliases: ['sonic', 'sonic blast'] },
  { id: 'shake', name: 'Vanilla Shake', serving: 'medium', calories: 680, protein: 12, carbs: 92, fat: 28 },
  { id: 'breakfast-burrito', name: 'Breakfast Burrito', serving: '1 burrito', calories: 440, protein: 18, carbs: 35, fat: 25 },
]);

// —— Arby's ——
chain("Arby's", 'arbys', [
  { id: 'roast-beef-classic', name: 'Classic Roast Beef', serving: '1 sandwich', calories: 360, protein: 23, carbs: 37, fat: 14, aliases: ["arby's", 'arbys', 'roast beef'] },
  { id: 'beef-n-cheddar', name: "Beef 'n Cheddar Classic", serving: '1 sandwich', calories: 450, protein: 23, carbs: 45, fat: 20 },
  { id: 'french-dip', name: 'French Dip & Swiss', serving: '1 sandwich', calories: 520, protein: 31, carbs: 48, fat: 22 },
  { id: 'smokehouse', name: 'Smokehouse Brisket', serving: '1 sandwich', calories: 600, protein: 28, carbs: 53, fat: 30 },
  { id: 'chicken-tenders-3', name: 'Chicken Tenders', serving: '3 pieces', calories: 360, protein: 24, carbs: 24, fat: 18 },
  { id: 'crinkle-fries', name: 'Crinkle Fries', serving: 'medium', calories: 410, protein: 5, carbs: 52, fat: 20 },
  { id: 'curly-fries', name: 'Curly Fries', serving: 'medium', calories: 410, protein: 5, carbs: 49, fat: 22, aliases: ["arby's", 'curly fries'] },
  { id: 'loaded-curly', name: 'Loaded Curly Fries', serving: '1 serving', calories: 660, protein: 14, carbs: 55, fat: 41 },
  { id: 'moz-sticks', name: 'Mozzarella Sticks', serving: '4 pieces', calories: 430, protein: 16, carbs: 36, fat: 24 },
  { id: 'jamocha', name: 'Jamocha Shake', serving: 'medium', calories: 550, protein: 12, carbs: 90, fat: 14 },
  { id: 'gyro', name: 'Gyro', serving: '1 sandwich', calories: 680, protein: 28, carbs: 58, fat: 36 },
]);

// —— Jack in the Box ——
chain('Jack in the Box', 'jitb', [
  { id: 'jumbo-jack', name: 'Jumbo Jack', serving: '1 sandwich', calories: 650, protein: 22, carbs: 50, fat: 40 },
  { id: 'jumbo-jack-cheese', name: 'Jumbo Jack with Cheese', serving: '1 sandwich', calories: 720, protein: 26, carbs: 51, fat: 46 },
  { id: 'ultimate-cheeseburger', name: 'Ultimate Cheeseburger', serving: '1 sandwich', calories: 940, protein: 42, carbs: 53, fat: 63 },
  { id: 'spicy-chicken', name: 'Spicy Chicken Sandwich', serving: '1 sandwich', calories: 590, protein: 24, carbs: 54, fat: 30 },
  { id: 'tacos-2', name: 'Tacos', serving: '2 tacos', calories: 340, protein: 10, carbs: 30, fat: 20, aliases: ['jack in the box', 'jack tacos'] },
  { id: 'tiny-tacos', name: 'Tiny Tacos', serving: '10 pieces', calories: 430, protein: 13, carbs: 40, fat: 24 },
  { id: 'curly-fries', name: 'Curly Fries', serving: 'medium', calories: 400, protein: 5, carbs: 49, fat: 21 },
  { id: 'egg-rolls', name: 'Egg Rolls', serving: '3 pieces', calories: 480, protein: 14, carbs: 48, fat: 26 },
  { id: 'breakfast-jack', name: 'Breakfast Jack', serving: '1 sandwich', calories: 310, protein: 16, carbs: 29, fat: 14 },
  { id: 'supreme-croissant', name: 'Supreme Croissant', serving: '1 sandwich', calories: 550, protein: 22, carbs: 36, fat: 35 },
  { id: 'hash-browns', name: 'Hash Browns', serving: '1 serving', calories: 150, protein: 1, carbs: 14, fat: 10 },
  { id: 'milkshake', name: 'Oreo Cookie Shake', serving: 'medium', calories: 820, protein: 13, carbs: 117, fat: 34 },
]);

// Wahoo's Fish Taco lives in commonFoods.js (curated menu).

chain('Qdoba', 'qdoba', [
  { id: 'burrito-chicken', name: 'Chicken Burrito', serving: '1 burrito', calories: 700, protein: 38, carbs: 78, fat: 24 },
  { id: 'burrito-steak', name: 'Steak Burrito', serving: '1 burrito', calories: 720, protein: 40, carbs: 76, fat: 26 },
  { id: 'bowl-chicken', name: 'Chicken Bowl', serving: '1 bowl', calories: 520, protein: 36, carbs: 48, fat: 18 },
  { id: 'bowl-steak', name: 'Steak Bowl', serving: '1 bowl', calories: 540, protein: 38, carbs: 46, fat: 20 },
  { id: 'tacos-chicken', name: 'Chicken Soft Tacos', serving: '3 tacos', calories: 510, protein: 36, carbs: 45, fat: 18 },
  { id: 'quesadilla', name: 'Chicken Quesadilla', serving: '1 quesadilla', calories: 780, protein: 42, carbs: 58, fat: 40 },
  { id: 'nachos', name: 'Street Style Nachos with Chicken', serving: '1 order', calories: 1100, protein: 48, carbs: 90, fat: 62 },
  { id: 'guac', name: 'Guacamole', serving: '1 serving', calories: 150, protein: 2, carbs: 8, fat: 13 },
  { id: 'queso', name: 'Queso', serving: '1 serving', calories: 110, protein: 4, carbs: 6, fat: 8 },
]);

// —— More Subway ——
chain('Subway', 'subway2', [
  { id: 'tuna', name: 'Tuna Sandwich (6")', serving: '6-inch', calories: 480, protein: 20, carbs: 45, fat: 25, aliases: ['subway', 'tuna sub'] },
  { id: 'cold-cut', name: 'Cold Cut Combo (6")', serving: '6-inch', calories: 370, protein: 18, carbs: 46, fat: 13 },
  { id: 'steak-cheese', name: 'Steak & Cheese (6")', serving: '6-inch', calories: 380, protein: 24, carbs: 47, fat: 10 },
  { id: 'spicy-italian', name: 'Spicy Italian (6")', serving: '6-inch', calories: 480, protein: 20, carbs: 46, fat: 24 },
  { id: 'chicken-bacon-ranch', name: 'Chicken & Bacon Ranch Melt (6")', serving: '6-inch', calories: 540, protein: 36, carbs: 47, fat: 24 },
  { id: 'veggie-delite', name: 'Veggie Delite (6")', serving: '6-inch', calories: 200, protein: 8, carbs: 40, fat: 2 },
  { id: 'oven-roasted-chicken', name: 'Oven Roasted Chicken (6")', serving: '6-inch', calories: 290, protein: 23, carbs: 46, fat: 4 },
  { id: 'footlong-turkey', name: 'Turkey Breast Sandwich (Footlong)', serving: 'footlong', calories: 560, protein: 36, carbs: 92, fat: 7 },
  { id: 'cookie-choc', name: 'Chocolate Chip Cookie', serving: '1 cookie', calories: 220, protein: 2, carbs: 30, fat: 10 },
  { id: 'chips', name: "Lay's Classic Chips", serving: '1 bag', calories: 230, protein: 3, carbs: 23, fat: 15 },
]);

// —— More Chick-fil-A ——
chain('Chick-fil-A', 'cfa2', [
  { id: 'nuggets-8', name: 'Chicken Nuggets', serving: '8 pieces', calories: 250, protein: 27, carbs: 11, fat: 11, aliases: ['chick-fil-a', 'chickfila', 'cfa nuggets'] },
  { id: 'nuggets-12', name: 'Chicken Nuggets', serving: '12 pieces', calories: 380, protein: 41, carbs: 16, fat: 16 },
  { id: 'strips-3', name: 'Chicken Strips', serving: '3 pieces', calories: 310, protein: 29, carbs: 16, fat: 14 },
  { id: 'grilled-nuggets-8', name: 'Grilled Nuggets', serving: '8 pieces', calories: 130, protein: 25, carbs: 1, fat: 3 },
  { id: 'grilled-nuggets-12', name: 'Grilled Nuggets', serving: '12 pieces', calories: 200, protein: 38, carbs: 2, fat: 4.5 },
  { id: 'spicy-sandwich', name: 'Spicy Chicken Sandwich', serving: '1 sandwich', calories: 460, protein: 28, carbs: 46, fat: 19 },
  { id: 'deluxe', name: 'Chicken Sandwich Deluxe', serving: '1 sandwich', calories: 500, protein: 29, carbs: 43, fat: 22 },
  { id: 'grilled-club', name: 'Grilled Chicken Club', serving: '1 sandwich', calories: 490, protein: 42, carbs: 40, fat: 19 },
  { id: 'cobb', name: 'Cobb Salad', serving: '1 salad', calories: 670, protein: 42, carbs: 28, fat: 44 },
  { id: 'market-salad', name: 'Market Salad', serving: '1 salad', calories: 540, protein: 28, carbs: 44, fat: 30 },
  { id: 'waffle-fries', name: 'Waffle Potato Fries', serving: 'medium', calories: 420, protein: 5, carbs: 53, fat: 21 },
  { id: 'mac', name: 'Mac & Cheese', serving: 'medium', calories: 310, protein: 13, carbs: 27, fat: 17 },
  { id: 'kale', name: 'Kale Crunch Side', serving: '1 side', calories: 150, protein: 3, carbs: 9, fat: 12 },
  { id: 'cookie', name: 'Chocolate Chunk Cookie', serving: '1 cookie', calories: 370, protein: 4, carbs: 46, fat: 19 },
  { id: 'frosted-lemonade', name: 'Frosted Lemonade', serving: 'medium', calories: 330, protein: 6, carbs: 67, fat: 6 },
  { id: 'frosted-coffee', name: 'Frosted Coffee', serving: 'medium', calories: 250, protein: 7, carbs: 42, fat: 6 },
  { id: 'chicken-biscuit', name: 'Chicken Biscuit', serving: '1 sandwich', calories: 460, protein: 19, carbs: 49, fat: 21 },
  { id: 'minis', name: 'Chick-n-Minis', serving: '4 pack', calories: 360, protein: 18, carbs: 36, fat: 14 },
]);

// —— Trader Joe's ——
chain("Trader Joe's", 'tj', [
  { id: 'mandarin-orange-chicken', name: 'Mandarin Orange Chicken', serving: '1 cup cooked', calories: 300, protein: 14, carbs: 32, fat: 13, aliases: ["trader joe's", 'trader joes', 'tj orange chicken'] },
  { id: 'carne-asada', name: 'Carne Asada', serving: '4 oz', calories: 180, protein: 24, carbs: 2, fat: 8 },
  { id: 'chicken-burritos', name: 'Chicken Burritos', serving: '1 burrito', calories: 320, protein: 14, carbs: 42, fat: 10 },
  { id: 'gyoza', name: 'Chicken Gyoza Potstickers', serving: '4 pieces', calories: 180, protein: 8, carbs: 24, fat: 6 },
  { id: 'cauliflower-gnocchi', name: 'Cauliflower Gnocchi', serving: '1 cup', calories: 140, protein: 2, carbs: 22, fat: 3 },
  { id: 'greek-yogurt', name: 'Greek Whole Milk Yogurt Plain', serving: '1 cup', calories: 220, protein: 20, carbs: 9, fat: 11 },
  { id: 'cottage-cheese', name: 'Cottage Cheese 4%', serving: '1/2 cup', calories: 110, protein: 13, carbs: 4, fat: 5 },
  { id: 'beef-bolognese', name: 'Beef Bolognese Sauce', serving: '1/2 cup', calories: 140, protein: 8, carbs: 8, fat: 8 },
  { id: 'pad-thai', name: 'Pad Thai with Charbroiled Chicken', serving: '1 package', calories: 480, protein: 22, carbs: 58, fat: 17 },
  { id: 'elote', name: 'Elote Chopped Salad Kit', serving: '1/2 bag', calories: 240, protein: 4, carbs: 18, fat: 17 },
  { id: 'dark-chocolate-peanut', name: 'Dark Chocolate Peanut Butter Cups', serving: '2 cups', calories: 190, protein: 4, carbs: 17, fat: 13 },
  { id: 'protein-bar', name: 'Protein Bar Chocolate Chip', serving: '1 bar', calories: 200, protein: 15, carbs: 22, fat: 8 },
  { id: 'hashbrowns', name: 'Hashbrowns', serving: '2 patties', calories: 180, protein: 2, carbs: 20, fat: 10 },
  { id: 'turkey-burgers', name: 'Turkey Burgers', serving: '1 patty', calories: 170, protein: 21, carbs: 1, fat: 9 },
  { id: 'hold-the-cone', name: 'Hold the Cone Vanilla', serving: '1 cone', calories: 70, protein: 1, carbs: 10, fat: 3 },
  { id: 'soyaki', name: 'Soyaki Sauce', serving: '1 tbsp', calories: 35, protein: 1, carbs: 6, fat: 0.5 },
]);

// —— Costco food court expansion ——
chain('Costco', 'costco2', [
  { id: 'chicken-bake', name: 'Food Court Chicken Bake', serving: '1 bake', calories: 770, protein: 38, carbs: 70, fat: 36, aliases: ['costco', 'chicken bake'] },
  { id: 'pepperoni-pizza', name: 'Food Court Pepperoni Pizza', serving: '1 slice', calories: 760, protein: 33, carbs: 69, fat: 38 },
  { id: 'combo-pizza', name: 'Food Court Combo Pizza', serving: '1 slice', calories: 790, protein: 34, carbs: 70, fat: 40 },
  { id: 'churro', name: 'Food Court Churro', serving: '1 churro', calories: 550, protein: 6, carbs: 76, fat: 25 },
  { id: 'smoothie', name: 'Food Court Berry Smoothie', serving: '1 smoothie', calories: 300, protein: 4, carbs: 70, fat: 1 },
]);

chain('Kirkland', 'kirkland2', [
  { id: 'protein-bar-pb', name: 'Protein Bar Peanut Butter Chocolate Chip', serving: '1 bar', calories: 190, protein: 21, carbs: 23, fat: 7, aliases: ['kirkland', 'costco protein bar'] },
  { id: 'protein-shake', name: 'Protein Shake Chocolate', serving: '1 bottle', calories: 160, protein: 30, carbs: 5, fat: 2.5 },
  { id: 'almonds', name: 'Roasted Almonds', serving: '1 oz', calories: 160, protein: 6, carbs: 6, fat: 14 },
  { id: 'organic-eggs', name: 'Organic Eggs', serving: '1 large', calories: 70, protein: 6, carbs: 0, fat: 5 },
]);

// —— Grocery staples ——
[
  ['cheese-cheddar', 'Cheddar cheese', 'Generic', '1 oz', 110, 7, 1, 9, ['cheddar']],
  ['cheese-mozz', 'Mozzarella, part-skim', 'Generic', '1 oz', 70, 7, 1, 4.5, ['mozzarella']],
  ['cheese-swiss', 'Swiss cheese', 'Generic', '1 oz', 110, 8, 1, 9, ['swiss']],
  ['cheese-american', 'American cheese', 'Generic', '1 slice', 60, 3, 2, 4.5, ['american cheese']],
  ['cheese-pepper-jack', 'Pepper Jack cheese', 'Generic', '1 oz', 100, 6, 0, 8],
  ['cheese-feta', 'Feta cheese', 'Generic', '1 oz', 75, 4, 1, 6, ['feta']],
  ['cheese-parmesan', 'Parmesan, grated', 'Generic', '2 tbsp', 40, 4, 0, 3, ['parmesan']],
  ['cheese-cream', 'Cream cheese', 'Generic', '2 tbsp', 100, 2, 2, 10, ['cream cheese']],
  ['cheese-string', 'String cheese', 'Generic', '1 stick', 80, 7, 1, 5, ['string cheese']],
  ['cheese-brie', 'Brie', 'Generic', '1 oz', 95, 6, 0, 8],
  ['cheese-goat', 'Goat cheese', 'Generic', '1 oz', 80, 5, 0, 6],
  ['cheese-ricotta', 'Ricotta, part-skim', 'Generic', '1/2 cup', 170, 14, 8, 10, ['ricotta']],
  ['cheese-cottage-lowfat', 'Cottage cheese, 1%', 'Generic', '1/2 cup', 80, 14, 3, 1, ['cottage cheese']],
  ['cheese-cottage-2', 'Cottage cheese, 2%', 'Generic', '1/2 cup', 90, 13, 5, 2.5],
  ['cheese-cottage-4', 'Cottage cheese, 4%', 'Generic', '1/2 cup', 110, 12, 4, 5],
  ['almonds', 'Almonds', 'Generic', '1 oz (23 nuts)', 160, 6, 6, 14, ['almond']],
  ['peanuts', 'Peanuts', 'Generic', '1 oz', 160, 7, 5, 14],
  ['cashews', 'Cashews', 'Generic', '1 oz', 155, 5, 9, 12],
  ['walnuts', 'Walnuts', 'Generic', '1 oz', 185, 4, 4, 18],
  ['pistachios', 'Pistachios', 'Generic', '1 oz', 160, 6, 8, 13],
  ['pecans', 'Pecans', 'Generic', '1 oz', 200, 3, 4, 20],
  ['chia', 'Chia seeds', 'Generic', '1 tbsp', 60, 2, 5, 4, ['chia']],
  ['flax', 'Flaxseed, ground', 'Generic', '1 tbsp', 35, 1.5, 2, 2.5, ['flax']],
  ['sunflower', 'Sunflower seeds', 'Generic', '1 oz', 165, 5.5, 7, 14],
  ['pumpkin-seeds', 'Pumpkin seeds', 'Generic', '1 oz', 160, 8, 3, 14, ['pepitas']],
  ['pb', 'Peanut butter', 'Generic', '2 tbsp', 190, 8, 7, 16, ['peanut butter']],
  ['almond-butter', 'Almond butter', 'Generic', '2 tbsp', 190, 7, 6, 17],
  ['olive-oil', 'Olive oil', 'Generic', '1 tbsp', 120, 0, 0, 14],
  ['butter', 'Butter', 'Generic', '1 tbsp', 100, 0, 0, 11],
  ['mayo', 'Mayonnaise', 'Generic', '1 tbsp', 90, 0, 0, 10, ['mayo']],
  ['mayo-light', 'Light mayonnaise', 'Generic', '1 tbsp', 35, 0, 1, 3.5],
  ['ketchup', 'Ketchup', 'Generic', '1 tbsp', 20, 0, 5, 0],
  ['mustard', 'Mustard', 'Generic', '1 tsp', 5, 0, 0, 0],
  ['soy-sauce', 'Soy sauce', 'Generic', '1 tbsp', 10, 1, 1, 0],
  ['hot-sauce', 'Hot sauce', 'Generic', '1 tsp', 0, 0, 0, 0],
  ['sriracha', 'Sriracha', 'Generic', '1 tsp', 5, 0, 1, 0],
  ['bbq-sauce', 'BBQ sauce', 'Generic', '2 tbsp', 50, 0, 12, 0],
  ['ranch', 'Ranch dressing', 'Generic', '2 tbsp', 140, 1, 2, 14, ['ranch']],
  ['italian-dressing', 'Italian dressing', 'Generic', '2 tbsp', 80, 0, 3, 8],
  ['caesar-dressing', 'Caesar dressing', 'Generic', '2 tbsp', 160, 1, 1, 17],
  ['honey', 'Honey', 'Generic', '1 tbsp', 60, 0, 17, 0],
  ['maple', 'Maple syrup', 'Generic', '2 tbsp', 100, 0, 26, 0],
  ['jam', 'Strawberry jam', 'Generic', '1 tbsp', 50, 0, 13, 0],
  ['cheerios', 'Cheerios', 'General Mills', '1 cup', 100, 3, 20, 2, ['cheerios']],
  ['honey-nut-cheerios', 'Honey Nut Cheerios', 'General Mills', '1 cup', 140, 3, 30, 2],
  ['frosted-flakes', 'Frosted Flakes', "Kellogg's", '1 cup', 140, 2, 33, 0],
  ['raisin-bran', 'Raisin Bran', "Kellogg's", '1 cup', 190, 5, 46, 1],
  ['special-k', 'Special K Original', "Kellogg's", '1 cup', 120, 6, 22, 0.5],
  ['froot-loops', 'Froot Loops', "Kellogg's", '1 cup', 140, 2, 31, 1],
  ['cinnamon-toast-crunch', 'Cinnamon Toast Crunch', 'General Mills', '1 cup', 170, 2, 32, 4],
  ['lucky-charms', 'Lucky Charms', 'General Mills', '1 cup', 140, 2, 30, 1],
  ['granola', 'Granola', 'Generic', '1/2 cup', 250, 6, 36, 10],
  ['grape-nuts', 'Grape-Nuts', 'Post', '1/2 cup', 210, 6, 47, 1],
  ['chips-lays', "Lay's Classic Potato Chips", "Lay's", '1 oz (about 15 chips)', 160, 2, 15, 10, ['lays', 'chips']],
  ['chips-doritos', 'Doritos Nacho Cheese', 'Doritos', '1 oz', 150, 2, 18, 8, ['doritos']],
  ['chips-cheetos', 'Cheetos Crunchy', 'Cheetos', '1 oz', 160, 2, 15, 10, ['cheetos']],
  ['pringles', 'Pringles Original', 'Pringles', '1 oz (about 13)', 150, 1, 15, 9, ['pringles']],
  ['popcorn', 'Popcorn, air-popped', 'Generic', '3 cups', 90, 3, 18, 1],
  ['popcorn-butter', 'Popcorn, movie theater', 'Generic', '2 cups', 220, 3, 20, 14],
  ['pretzel', 'Pretzels', 'Generic', '1 oz', 110, 3, 23, 1],
  ['tortilla-chips', 'Tortilla chips', 'Generic', '1 oz', 140, 2, 18, 7],
  ['hummus', 'Hummus', 'Generic', '2 tbsp', 50, 2, 4, 3, ['hummus']],
  ['guacamole', 'Guacamole', 'Generic', '2 tbsp', 50, 1, 3, 4, ['guac', 'guacamole']],
  ['salsa', 'Salsa', 'Generic', '2 tbsp', 10, 0, 2, 0],
  ['trail-mix', 'Trail mix', 'Generic', '1/4 cup', 170, 5, 16, 11],
  ['jerky', 'Beef jerky', 'Generic', '1 oz', 80, 12, 3, 2, ['jerky']],
  ['rice-cake', 'Rice cake, plain', 'Generic', '1 cake', 35, 1, 7, 0],
  ['icecream-vanilla', 'Ice cream, vanilla', 'Generic', '1/2 cup', 140, 2, 16, 7],
  ['icecream-chocolate', 'Ice cream, chocolate', 'Generic', '1/2 cup', 150, 2.5, 18, 7],
  ['ben-jerry-halfbaked', "Ben & Jerry's Half Baked", "Ben & Jerry's", '1/2 cup', 280, 4, 35, 14, ['ben and jerrys', 'half baked']],
  ['halo-top', 'Halo Top Vanilla Bean', 'Halo Top', '1 pint', 280, 20, 56, 8, ['halo top']],
  ['yasso', 'Yasso Frozen Greek Yogurt Bar', 'Yasso', '1 bar', 80, 5, 13, 0.5, ['yasso']],
  ['popsicle', 'Popsicle, fruit ice', 'Generic', '1 pop', 40, 0, 10, 0],
  ['cookie-choc-chip', 'Chocolate chip cookie', 'Generic', '1 medium', 150, 2, 20, 7],
  ['brownie', 'Brownie', 'Generic', '2-inch square', 220, 3, 30, 10],
  ['cake-frosted', 'Chocolate cake with frosting', 'Generic', '1 slice', 350, 4, 50, 15],
  ['pie-apple', 'Apple pie', 'Generic', '1 slice', 300, 2, 42, 14],
  ['cheesecake', 'Cheesecake', 'Generic', '1 slice', 400, 7, 32, 28],
  ['coke', 'Coca-Cola', 'Coca-Cola', '12 fl oz can', 140, 0, 39, 0, ['coke', 'coca cola']],
  ['coke-zero', 'Coca-Cola Zero Sugar', 'Coca-Cola', '12 fl oz can', 0, 0, 0, 0, ['coke zero']],
  ['pepsi', 'Pepsi', 'Pepsi', '12 fl oz can', 150, 0, 41, 0],
  ['sprite', 'Sprite', 'Sprite', '12 fl oz can', 140, 0, 38, 0],
  ['drpepper', 'Dr Pepper', 'Dr Pepper', '12 fl oz can', 150, 0, 40, 0, ['dr pepper']],
  ['gatorade', 'Gatorade Thirst Quencher', 'Gatorade', '20 fl oz', 140, 0, 34, 0, ['gatorade']],
  ['bodyarmor', 'BODYARMOR SuperDrink', 'BODYARMOR', '16 fl oz', 110, 0, 28, 0, ['bodyarmor']],
  ['redbull', 'Red Bull', 'Red Bull', '8.4 fl oz', 110, 1, 28, 0, ['red bull']],
  ['monster', 'Monster Energy', 'Monster', '16 fl oz', 210, 0, 54, 0, ['monster']],
  ['beer', 'Beer, regular', 'Generic', '12 fl oz', 150, 1, 13, 0, ['beer']],
  ['beer-light', 'Beer, light', 'Generic', '12 fl oz', 100, 1, 5, 0],
  ['wine-red', 'Red wine', 'Generic', '5 fl oz', 125, 0, 4, 0],
  ['wine-white', 'White wine', 'Generic', '5 fl oz', 120, 0, 4, 0],
  ['vodka', 'Vodka', 'Generic', '1.5 fl oz shot', 97, 0, 0, 0],
  ['orange-juice', 'Orange juice', 'Generic', '1 cup', 110, 2, 26, 0, ['oj', 'orange juice']],
  ['apple-juice', 'Apple juice', 'Generic', '1 cup', 115, 0, 28, 0],
  ['lemonade', 'Lemonade', 'Generic', '1 cup', 100, 0, 26, 0],
  ['kombucha', 'Kombucha', 'Generic', '8 fl oz', 30, 0, 7, 0],
  ['lamb-chop', 'Lamb chop, grilled', 'Generic', '4 oz', 280, 28, 0, 18],
  ['bison', 'Bison, ground, cooked', 'Generic', '4 oz', 180, 24, 0, 9],
  ['duck', 'Duck breast, roasted', 'Generic', '4 oz', 230, 26, 0, 13],
  ['venison', 'Venison, roasted', 'Generic', '4 oz', 160, 32, 0, 2.5],
  ['sardines', 'Sardines, canned in oil', 'Generic', '1 can (3.75 oz)', 190, 22, 0, 11, ['sardines']],
  ['anchovies', 'Anchovies, canned', 'Generic', '5 fillets', 40, 6, 0, 2],
  ['crab', 'Crab, cooked', 'Generic', '4 oz', 110, 22, 0, 1.5],
  ['lobster', 'Lobster, cooked', 'Generic', '4 oz', 110, 23, 0, 1],
  ['scallops', 'Scallops, cooked', 'Generic', '4 oz', 120, 23, 0, 1.5],
  ['clams', 'Clams, cooked', 'Generic', '4 oz', 140, 24, 5, 2],
  ['mussels', 'Mussels, cooked', 'Generic', '4 oz', 150, 20, 6, 4],
  ['seitan', 'Seitan', 'Generic', '3 oz', 120, 21, 5, 2, ['seitan']],
  ['edamame', 'Edamame, shelled', 'Generic', '1 cup', 190, 18, 14, 8, ['edamame']],
  ['lentils', 'Lentils, cooked', 'Generic', '1 cup', 230, 18, 40, 0.8, ['lentils']],
  ['black-beans', 'Black beans, cooked', 'Generic', '1 cup', 225, 15, 40, 1, ['black beans']],
  ['chickpeas', 'Chickpeas, cooked', 'Generic', '1 cup', 270, 15, 45, 4, ['chickpeas', 'garbanzo']],
  ['kidney-beans', 'Kidney beans, cooked', 'Generic', '1 cup', 225, 15, 40, 1],
  ['pinto-beans', 'Pinto beans, cooked', 'Generic', '1 cup', 245, 15, 45, 1],
  ['refried-beans', 'Refried beans', 'Generic', '1/2 cup', 120, 7, 18, 3],
  ['garlic-bread', 'Garlic bread', 'Generic', '1 slice', 150, 4, 18, 7],
  ['dinner-roll', 'Dinner roll', 'Generic', '1 roll', 100, 3, 18, 2],
  ['croissant', 'Croissant', 'Generic', '1 medium', 230, 5, 26, 12],
  ['biscuit', 'Biscuit', 'Generic', '1 biscuit', 180, 3, 22, 9],
  ['cornbread', 'Cornbread', 'Generic', '1 piece', 180, 4, 28, 6],
  ['naan', 'Naan', 'Generic', '1 piece', 260, 8, 45, 5, ['naan']],
  ['pita', 'Pita bread', 'Generic', '1 pita', 165, 6, 33, 1],
  ['polenta', 'Polenta, cooked', 'Generic', '1 cup', 145, 3, 31, 1],
  ['risotto', 'Risotto', 'Generic', '1 cup', 280, 7, 42, 9],
  ['mac-cheese', 'Macaroni and cheese', 'Generic', '1 cup', 310, 12, 35, 13, ['mac and cheese', 'mac n cheese']],
  ['mashed-potatoes', 'Mashed potatoes with butter', 'Generic', '1 cup', 230, 4, 35, 9],
  ['french-fries', 'French fries', 'Generic', 'medium', 340, 4, 44, 16],
  ['onion-rings', 'Onion rings', 'Generic', '6 rings', 280, 4, 32, 15],
  ['coleslaw', 'Coleslaw', 'Generic', '1/2 cup', 150, 1, 14, 10],
  ['corn-on-cob', 'Corn on the cob', 'Generic', '1 ear', 90, 3, 19, 1],
  ['baked-beans', 'Baked beans', 'Generic', '1/2 cup', 150, 7, 28, 1],
  ['spaghetti-sauce', 'Marinara sauce', 'Generic', '1/2 cup', 70, 2, 12, 2],
  ['alfredo-sauce', 'Alfredo sauce', 'Generic', '1/2 cup', 220, 5, 6, 20],
  ['pesto', 'Pesto', 'Generic', '2 tbsp', 150, 3, 2, 15],
  ['soup-chicken-noodle', 'Chicken noodle soup', 'Generic', '1 cup', 100, 6, 12, 3],
  ['soup-tomato', 'Tomato soup', 'Generic', '1 cup', 150, 3, 30, 2],
  ['soup-chili', 'Chili with beans', 'Generic', '1 cup', 260, 18, 28, 8],
  ['ramen-cup', 'Instant ramen cup', 'Generic', '1 cup prepared', 380, 8, 52, 14, ['ramen']],
  ['sushi-california', 'California roll', 'Generic', '6 pieces', 255, 9, 38, 7],
  ['sushi-spicy-tuna', 'Spicy tuna roll', 'Generic', '6 pieces', 290, 16, 34, 10],
  ['sushi-salmon', 'Salmon nigiri', 'Generic', '2 pieces', 120, 12, 12, 3],
  ['pho', 'Pho with beef', 'Generic', '1 bowl', 450, 30, 55, 10, ['pho']],
  ['bibimbap', 'Bibimbap', 'Generic', '1 bowl', 520, 24, 68, 16],
  ['ramen-tonkotsu', 'Tonkotsu ramen', 'Generic', '1 bowl', 650, 28, 70, 28],
  ['tacos-al-pastor', 'Al pastor tacos', 'Generic', '2 tacos', 340, 20, 28, 16],
  ['carnitas', 'Carnitas', 'Generic', '4 oz', 250, 22, 0, 18],
  ['birria', 'Birria tacos', 'Generic', '2 tacos', 420, 24, 30, 22, ['birria']],
  ['empanada', 'Beef empanada', 'Generic', '1 empanada', 280, 10, 28, 14],
  ['falafel', 'Falafel', 'Generic', '3 pieces', 200, 8, 22, 10, ['falafel']],
  ['gyro-meat', 'Gyro meat', 'Generic', '4 oz', 280, 20, 4, 20],
  ['shawarma-chicken', 'Chicken shawarma', 'Generic', '4 oz', 220, 26, 4, 11],
  ['curry-chicken', 'Chicken curry with rice', 'Generic', '1 bowl', 520, 28, 55, 20],
  ['butter-chicken', 'Butter chicken with rice', 'Generic', '1 bowl', 620, 30, 58, 28],
  ['tikka-masala', 'Chicken tikka masala with rice', 'Generic', '1 bowl', 580, 32, 56, 24],
  ['samosa', 'Vegetable samosa', 'Generic', '1 samosa', 250, 5, 30, 12],
  ['hummus-plate', 'Hummus plate with pita', 'Generic', '1 plate', 420, 14, 48, 18],
  ['acai-bowl', 'Acai bowl', 'Generic', '1 bowl', 380, 6, 72, 10, ['acai']],
  ['smoothie-bowl', 'Smoothie bowl', 'Generic', '1 bowl', 350, 8, 65, 8],
  ['overnight-oats', 'Overnight oats', 'Generic', '1 jar', 320, 14, 48, 8],
  ['yogurt-parfait', 'Yogurt parfait', 'Generic', '1 parfait', 280, 14, 42, 6],
  ['protein-pancakes', 'Protein pancakes', 'Generic', '2 pancakes', 280, 24, 28, 6],
  ['turkey-bacon', 'Turkey bacon', 'Generic', '2 slices', 60, 6, 0, 4],
  ['canadian-bacon', 'Canadian bacon', 'Generic', '2 slices', 70, 12, 1, 2],
  ['chorizo', 'Chorizo, cooked', 'Generic', '2 oz', 180, 10, 1, 15],
  ['prosciutto', 'Prosciutto', 'Generic', '1 oz', 70, 8, 0, 4],
  ['salami', 'Salami', 'Generic', '1 oz', 110, 6, 1, 9],
  ['pepperoni', 'Pepperoni', 'Generic', '1 oz', 140, 6, 0, 13],
  ['hot-dog', 'Hot dog, beef', 'Generic', '1 frank', 150, 5, 2, 14],
  ['bratwurst', 'Bratwurst', 'Generic', '1 link', 260, 12, 2, 22],
  ['italian-sausage', 'Italian sausage', 'Generic', '1 link', 240, 12, 2, 20],
  ['veggie-burger', 'Veggie burger patty', 'Generic', '1 patty', 150, 14, 12, 6],
  ['beyond-burger', 'Beyond Burger patty', 'Beyond Meat', '1 patty', 230, 20, 5, 14, ['beyond']],
  ['impossible-burger', 'Impossible Burger patty', 'Impossible', '1 patty', 230, 19, 9, 13, ['impossible']],
  ['oat-milk', 'Oat milk', 'Generic', '1 cup', 120, 3, 16, 5, ['oat milk']],
  ['almond-milk', 'Almond milk, unsweetened', 'Generic', '1 cup', 30, 1, 1, 2.5, ['almond milk']],
  ['soy-milk', 'Soy milk', 'Generic', '1 cup', 100, 7, 8, 4],
  ['coconut-milk', 'Coconut milk, carton', 'Generic', '1 cup', 45, 0, 2, 4],
  ['protein-milk', 'Fairlife Core Power', 'Fairlife', '1 bottle (14 oz)', 170, 26, 5, 4.5],
  ['greek-yogurt-honey', 'Greek yogurt with honey', 'Generic', '1 cup', 220, 18, 28, 4],
  ['skyr', 'Skyr, plain', 'Generic', '1 cup', 150, 25, 8, 0, ['skyr']],
  ['kefir', 'Kefir, plain', 'Generic', '1 cup', 110, 11, 12, 2, ['kefir']],
  ['whipped-cream', 'Whipped cream', 'Generic', '2 tbsp', 30, 0, 1, 3],
  ['sour-cream', 'Sour cream', 'Generic', '2 tbsp', 60, 1, 1, 5],
  ['half-half', 'Half and half', 'Generic', '2 tbsp', 40, 1, 1, 3.5],
  ['heavy-cream', 'Heavy cream', 'Generic', '2 tbsp', 100, 1, 1, 11],
  ['coconut-oil', 'Coconut oil', 'Generic', '1 tbsp', 120, 0, 0, 14],
  ['avocado-oil', 'Avocado oil', 'Generic', '1 tbsp', 120, 0, 0, 14],
  ['ghee', 'Ghee', 'Generic', '1 tbsp', 120, 0, 0, 14],
  ['coconut-sugar', 'Coconut sugar', 'Generic', '1 tsp', 15, 0, 4, 0],
  ['brown-sugar', 'Brown sugar', 'Generic', '1 tsp', 15, 0, 4, 0],
  ['stevia', 'Stevia', 'Generic', '1 packet', 0, 0, 0, 0],
  ['protein-cereal', 'Magic Spoon Cereal', 'Magic Spoon', '1 cup', 140, 13, 15, 7, ['magic spoon']],
  ['catalina-crunch', 'Catalina Crunch', 'Catalina Crunch', '1/2 cup', 110, 11, 14, 5],
  ['highkey', 'HighKey Cookie', 'HighKey', '1 cookie', 100, 4, 10, 7],
  ['lily-chocolate', "Lily's Dark Chocolate", "Lily's", '1 oz', 120, 2, 18, 9, ["lily's"]],
  ['quest-chips', 'Quest Protein Chips', 'Quest', '1 bag', 140, 18, 5, 4.5, ['quest chips']],
  ['wizard-protein', 'Ratio Protein Yogurt', 'Ratio', '1 cup', 170, 25, 8, 4.5],
].forEach((row) => staple(...row));

// —— Olive Garden / Applebee's / Chipotle-style sit-down ——
chain('Olive Garden', 'olivegarden', [
  { id: 'salad', name: 'Garden Salad with Dressing', serving: '1 serving', calories: 150, protein: 2, carbs: 10, fat: 12, aliases: ['olive garden'] },
  { id: 'breadstick', name: 'Breadstick', serving: '1 breadstick', calories: 140, protein: 4, carbs: 25, fat: 2.5 },
  { id: 'zuppa', name: 'Zuppa Toscana', serving: 'bowl', calories: 220, protein: 8, carbs: 15, fat: 14 },
  { id: 'chicken-alfredo', name: 'Chicken Alfredo', serving: '1 entree', calories: 1460, protein: 81, carbs: 97, fat: 85 },
  { id: 'fettuccine', name: 'Fettuccine Alfredo', serving: '1 entree', calories: 1220, protein: 33, carbs: 96, fat: 78 },
  { id: 'lasagna', name: 'Lasagna Classico', serving: '1 entree', calories: 860, protein: 52, carbs: 63, fat: 45 },
  { id: 'shrimp-scampi', name: 'Shrimp Scampi', serving: '1 entree', calories: 650, protein: 36, carbs: 58, fat: 28 },
  { id: 'chicken-parm', name: 'Chicken Parmigiana', serving: '1 entree', calories: 1060, protein: 67, carbs: 80, fat: 50 },
  { id: 'soup-salad-bread', name: 'Soup, Salad & Breadsticks', serving: '1 meal', calories: 500, protein: 14, carbs: 60, fat: 22 },
]);

chain("Applebee's", 'applebees', [
  { id: 'boneless-wings', name: 'Boneless Wings', serving: '1 order', calories: 790, protein: 42, carbs: 58, fat: 42, aliases: ["applebee's", 'applebees'] },
  { id: 'mozzarella', name: 'Mozzarella Sticks', serving: '1 order', calories: 860, protein: 32, carbs: 68, fat: 50 },
  { id: 'spinach-dip', name: 'Spinach & Artichoke Dip', serving: '1 order', calories: 940, protein: 26, carbs: 64, fat: 64 },
  { id: 'classic-burger', name: 'Classic Burger', serving: '1 sandwich', calories: 890, protein: 48, carbs: 52, fat: 54 },
  { id: 'fiesta-lime', name: 'Fiesta Lime Chicken', serving: '1 entree', calories: 1180, protein: 64, carbs: 92, fat: 60 },
  { id: 'bourbon-street', name: 'Bourbon Street Chicken & Shrimp', serving: '1 entree', calories: 720, protein: 48, carbs: 42, fat: 38 },
  { id: 'riblets', name: 'Riblets Platter', serving: '1 platter', calories: 1250, protein: 58, carbs: 96, fat: 70 },
  { id: 'caesar', name: 'Chicken Caesar Salad', serving: '1 salad', calories: 800, protein: 48, carbs: 30, fat: 56 },
  { id: 'fries', name: 'French Fries', serving: '1 side', calories: 450, protein: 5, carbs: 56, fat: 22 },
]);

chain('Chipotle', 'chipotle2', [
  { id: 'chicken', name: 'Chicken', serving: '4 oz', calories: 180, protein: 32, carbs: 1, fat: 7, aliases: ['chipotle'] },
  { id: 'steak', name: 'Steak', serving: '4 oz', calories: 150, protein: 21, carbs: 1, fat: 6 },
  { id: 'carnitas', name: 'Carnitas', serving: '4 oz', calories: 210, protein: 23, carbs: 0, fat: 12 },
  { id: 'barbacoa', name: 'Barbacoa', serving: '4 oz', calories: 170, protein: 24, carbs: 2, fat: 7 },
  { id: 'sofritas', name: 'Sofritas', serving: '4 oz', calories: 150, protein: 8, carbs: 9, fat: 10 },
  { id: 'white-rice', name: 'Cilantro-Lime White Rice', serving: '4 oz', calories: 210, protein: 4, carbs: 40, fat: 4 },
  { id: 'brown-rice', name: 'Cilantro-Lime Brown Rice', serving: '4 oz', calories: 210, protein: 4, carbs: 36, fat: 6 },
  { id: 'black-beans', name: 'Black Beans', serving: '4 oz', calories: 130, protein: 8, carbs: 22, fat: 1.5 },
  { id: 'pinto-beans', name: 'Pinto Beans', serving: '4 oz', calories: 130, protein: 8, carbs: 21, fat: 1.5 },
  { id: 'fajita-veg', name: 'Fajita Vegetables', serving: '2.5 oz', calories: 20, protein: 1, carbs: 4, fat: 0 },
  { id: 'guac', name: 'Guacamole', serving: '4 oz', calories: 230, protein: 2, carbs: 8, fat: 22 },
  { id: 'queso', name: 'Queso Blanco', serving: '4 oz', calories: 120, protein: 5, carbs: 6, fat: 9 },
  { id: 'cheese', name: 'Cheese', serving: '1 oz', calories: 110, protein: 6, carbs: 1, fat: 8 },
  { id: 'sour-cream', name: 'Sour Cream', serving: '2 oz', calories: 110, protein: 2, carbs: 2, fat: 9 },
  { id: 'romaine', name: 'Romaine Lettuce', serving: '1 oz', calories: 5, protein: 0, carbs: 1, fat: 0 },
  { id: 'burrito-chicken', name: 'Chicken Burrito (typical build)', serving: '1 burrito', calories: 960, protein: 48, carbs: 100, fat: 38 },
  { id: 'bowl-chicken', name: 'Chicken Bowl (typical build)', serving: '1 bowl', calories: 700, protein: 46, carbs: 68, fat: 26 },
]);

// —— Starbucks expansion ——
chain('Starbucks', 'sbux2', [
  { id: 'pumpkin-loaf', name: 'Pumpkin Bread', serving: '1 slice', calories: 410, protein: 6, carbs: 63, fat: 15, aliases: ['starbucks'] },
  { id: 'banana-bread', name: 'Banana Bread', serving: '1 slice', calories: 380, protein: 5, carbs: 52, fat: 17 },
  { id: 'butter-croissant', name: 'Butter Croissant', serving: '1 croissant', calories: 260, protein: 5, carbs: 30, fat: 14 },
  { id: 'cheese-danish', name: 'Cheese Danish', serving: '1 pastry', calories: 290, protein: 6, carbs: 34, fat: 15 },
  { id: 'egg-bites', name: 'Bacon & Gruyère Egg Bites', serving: '2 bites', calories: 300, protein: 19, carbs: 9, fat: 20, aliases: ['starbucks', 'egg bites'] },
  { id: 'egg-bites-eggwhite', name: 'Egg White & Roasted Red Pepper Egg Bites', serving: '2 bites', calories: 170, protein: 12, carbs: 11, fat: 8 },
  { id: 'turkey-bacon', name: 'Turkey Bacon Cheddar & Egg White Sandwich', serving: '1 sandwich', calories: 230, protein: 17, carbs: 28, fat: 5 },
  { id: 'sausage-sandwich', name: 'Impossible Breakfast Sandwich', serving: '1 sandwich', calories: 420, protein: 21, carbs: 39, fat: 20 },
  { id: 'protein-box', name: 'Eggs & Cheddar Protein Box', serving: '1 box', calories: 470, protein: 22, carbs: 40, fat: 24 },
  { id: 'cold-brew', name: 'Cold Brew', serving: 'grande', calories: 5, protein: 0, carbs: 0, fat: 0 },
  { id: 'nitro', name: 'Nitro Cold Brew', serving: 'grande', calories: 5, protein: 0, carbs: 0, fat: 0 },
  { id: 'pink-drink', name: 'Pink Drink', serving: 'grande', calories: 140, protein: 1, carbs: 27, fat: 2.5, aliases: ['starbucks', 'pink drink'] },
  { id: 'matcha', name: 'Matcha Latte', serving: 'grande', calories: 200, protein: 9, carbs: 29, fat: 5 },
  { id: 'chai', name: 'Chai Latte', serving: 'grande', calories: 240, protein: 8, carbs: 45, fat: 3.5 },
  { id: 'caramel-frap', name: 'Caramel Frappuccino', serving: 'grande', calories: 380, protein: 5, carbs: 54, fat: 16 },
  { id: 'mocha-cookie', name: 'Mocha Cookie Crumble Frappuccino', serving: 'grande', calories: 480, protein: 6, carbs: 65, fat: 21 },
]);

addWave2({ add, chain, staple });

function serialize(food) {
  const aliases = food.aliases
    ? `, aliases: ${JSON.stringify(food.aliases)}`
    : '';
  return `  { id: ${JSON.stringify(food.id)}, name: ${JSON.stringify(food.name)}, brand: ${JSON.stringify(food.brand)}, serving: ${JSON.stringify(food.serving)}, calories: ${food.calories}, protein: ${food.protein}, carbs: ${food.carbs}, fat: ${food.fat}${aliases} }`;
}

const outPath = join(__dirname, '../src/lib/foodCatalogExtra.js');
const body = `/**
 * Large offline catalog expansion — generated by scripts/generate-food-catalog-extra.mjs
 * Do not hand-edit; re-run the generator instead.
 */

export const EXTRA_FOODS = [
${foods.map(serialize).join(',\n')},
];
`;

writeFileSync(outPath, body);
console.log(`Wrote ${foods.length} foods to ${outPath}`);
