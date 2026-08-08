/**
 * Second catalog wave — more chains, grocery brands, and gram-based staples.
 * Imported by generate-food-catalog-extra.mjs
 */

export function addWave2({ add, chain, staple }) {
  // —— Jersey Mike's ——
  chain("Jersey Mike's", 'jerseymikes', [
    { id: 'turkey-provolone', name: 'Turkey and Provolone (Regular)', serving: '1 regular', calories: 620, protein: 42, carbs: 58, fat: 24, aliases: ["jersey mike's", 'jersey mikes', 'jersey mike'] },
    { id: 'club', name: 'Club Sub (Regular)', serving: '1 regular', calories: 740, protein: 46, carbs: 58, fat: 36 },
    { id: 'italian', name: 'The Original Italian (Regular)', serving: '1 regular', calories: 820, protein: 38, carbs: 58, fat: 48, aliases: ["jersey mike's", 'jersey mikes', 'italian sub'] },
    { id: 'ham-provolone', name: 'Ham and Provolone (Regular)', serving: '1 regular', calories: 640, protein: 38, carbs: 58, fat: 28 },
    { id: 'roast-beef', name: 'Roast Beef and Provolone (Regular)', serving: '1 regular', calories: 660, protein: 44, carbs: 58, fat: 26 },
    { id: 'tuna', name: 'Tuna Fish (Regular)', serving: '1 regular', calories: 780, protein: 36, carbs: 58, fat: 42 },
    { id: 'chicken-cheese', name: 'Chicken and Provolone (Regular)', serving: '1 regular', calories: 640, protein: 48, carbs: 58, fat: 22 },
    { id: 'chipotle-chicken', name: 'Chipotle Chicken Cheese Steak (Regular)', serving: '1 regular', calories: 720, protein: 46, carbs: 60, fat: 32 },
    { id: 'meatball', name: 'Meatball (Regular)', serving: '1 regular', calories: 860, protein: 40, carbs: 72, fat: 42 },
    { id: 'blt', name: 'BLT (Regular)', serving: '1 regular', calories: 700, protein: 28, carbs: 56, fat: 40 },
    { id: 'giant-italian', name: 'The Original Italian (Giant)', serving: '1 giant', calories: 1230, protein: 57, carbs: 87, fat: 72 },
    { id: 'chips', name: 'Potato Chips', serving: '1 bag', calories: 150, protein: 2, carbs: 15, fat: 10 },
  ]);

  // —— Jimmy John's ——
  chain("Jimmy John's", 'jimmyjohns', [
    { id: 'italy', name: 'The Italian Night Club', serving: '1 8" sub', calories: 930, protein: 40, carbs: 63, fat: 56, aliases: ["jimmy john's", 'jimmy johns', 'jimmy john'] },
    { id: 'hunter', name: "Hunter's Club", serving: '1 8" sub', calories: 720, protein: 38, carbs: 61, fat: 34 },
    { id: 'billy', name: 'Billy Club', serving: '1 8" sub', calories: 640, protein: 34, carbs: 61, fat: 28 },
    { id: 'bootlegger', name: 'Bootlegger Club', serving: '1 8" sub', calories: 690, protein: 36, carbs: 61, fat: 32 },
    { id: 'turkey-tom', name: 'Turkey Tom', serving: '1 8" sub', calories: 470, protein: 28, carbs: 60, fat: 12, aliases: ["jimmy john's", 'turkey tom'] },
    { id: 'vito', name: 'Vito', serving: '1 8" sub', calories: 670, protein: 30, carbs: 61, fat: 34 },
    { id: 'j-j-gargantuan', name: 'J.J. Gargantuan', serving: '1 8" sub', calories: 1120, protein: 58, carbs: 64, fat: 70 },
    { id: 'slim-1', name: 'Slim 1 (Ham & Cheese)', serving: '1 8" sub', calories: 480, protein: 24, carbs: 56, fat: 18 },
    { id: 'slim-4', name: 'Slim 4 (Turkey Breast)', serving: '1 8" sub', calories: 340, protein: 22, carbs: 56, fat: 4 },
    { id: 'unwich-turkey', name: 'Unwich Turkey Tom', serving: '1 unwich', calories: 220, protein: 24, carbs: 4, fat: 12, aliases: ["jimmy john's", 'unwich'] },
    { id: 'pickle', name: 'Jumbo Kosher Dill Pickle', serving: '1 pickle', calories: 15, protein: 0, carbs: 3, fat: 0 },
  ]);

  // —— Culver's ——
  chain("Culver's", 'culvers', [
    { id: 'butterburger', name: 'ButterBurger', serving: 'single', calories: 390, protein: 17, carbs: 37, fat: 19, aliases: ["culver's", 'culvers', 'butterburger'] },
    { id: 'butterburger-cheese', name: 'ButterBurger with Cheese', serving: 'single', calories: 460, protein: 21, carbs: 37, fat: 25 },
    { id: 'deluxe', name: 'ButterBurger Deluxe', serving: 'single', calories: 530, protein: 23, carbs: 39, fat: 30 },
    { id: 'bacon-deluxe', name: 'ButterBurger Bacon Deluxe', serving: 'single', calories: 610, protein: 28, carbs: 39, fat: 36 },
    { id: 'double-cheese', name: 'ButterBurger with Cheese', serving: 'double', calories: 700, protein: 37, carbs: 38, fat: 42 },
    { id: 'crispy-chicken', name: 'Crispy Chicken Sandwich', serving: '1 sandwich', calories: 530, protein: 26, carbs: 48, fat: 26 },
    { id: 'grilled-chicken', name: 'Grilled Chicken Sandwich', serving: '1 sandwich', calories: 390, protein: 34, carbs: 40, fat: 10 },
    { id: 'tenders-4', name: 'Chicken Tenders', serving: '4 pieces', calories: 650, protein: 42, carbs: 36, fat: 36 },
    { id: 'cod-dinner', name: 'North Atlantic Cod Dinner', serving: '2 piece', calories: 1060, protein: 36, carbs: 98, fat: 56 },
    { id: 'fries', name: 'Crinkle Cut Fries', serving: 'regular', calories: 360, protein: 4, carbs: 47, fat: 17 },
    { id: 'cheese-curds', name: 'Wisconsin Cheese Curds', serving: 'regular', calories: 670, protein: 30, carbs: 41, fat: 43, aliases: ["culver's", 'cheese curds'] },
    { id: 'concrete-mixer', name: 'Chocolate Concrete Mixer', serving: 'mini', calories: 560, protein: 10, carbs: 72, fat: 26, aliases: ["culver's", 'concrete mixer'] },
    { id: 'custard-dish', name: 'Vanilla Fresh Frozen Custard', serving: 'dish', calories: 400, protein: 8, carbs: 46, fat: 20 },
  ]);

  // —— CAVA ——
  chain('CAVA', 'cava', [
    { id: 'chicken', name: 'Grilled Chicken', serving: '1 scoop', calories: 160, protein: 28, carbs: 1, fat: 5, aliases: ['cava'] },
    { id: 'spicy-lamb', name: 'Spicy Lamb Meatballs', serving: '1 scoop', calories: 180, protein: 14, carbs: 6, fat: 11 },
    { id: 'falafel', name: 'Falafel', serving: '1 scoop', calories: 170, protein: 6, carbs: 18, fat: 9 },
    { id: 'braised-lamb', name: 'Braised Lamb', serving: '1 scoop', calories: 180, protein: 16, carbs: 4, fat: 11 },
    { id: 'black-lentils', name: 'Black Lentils', serving: '1 scoop', calories: 100, protein: 7, carbs: 16, fat: 1.5 },
    { id: 'saffron-basmati', name: 'Saffron Basmati Rice', serving: '1 scoop', calories: 150, protein: 3, carbs: 30, fat: 2 },
    { id: 'brown-rice', name: 'Brown Rice', serving: '1 scoop', calories: 160, protein: 3, carbs: 32, fat: 2.5 },
    { id: 'crazy-feta', name: 'Crazy Feta', serving: '1 scoop', calories: 70, protein: 2, carbs: 2, fat: 6, aliases: ['cava', 'crazy feta'] },
    { id: 'hummus', name: 'Classic Hummus', serving: '1 scoop', calories: 90, protein: 3, carbs: 6, fat: 6 },
    { id: 'harissa', name: 'Harissa', serving: '1 scoop', calories: 15, protein: 0, carbs: 2, fat: 1 },
    { id: 'garlic-dressing', name: 'Garlic Dressing', serving: '1 scoop', calories: 160, protein: 1, carbs: 2, fat: 17 },
    { id: 'greek-salad', name: 'Greek Salad Bowl (typical)', serving: '1 bowl', calories: 650, protein: 38, carbs: 42, fat: 36 },
    { id: 'chicken-rice-bowl', name: 'Chicken + Rice Bowl (typical)', serving: '1 bowl', calories: 720, protein: 42, carbs: 68, fat: 30 },
    { id: 'pita', name: 'Pita', serving: '1 pita', calories: 180, protein: 6, carbs: 34, fat: 2.5 },
  ]);

  // —— Sweetgreen ——
  chain('Sweetgreen', 'sweetgreen', [
    { id: 'harvest-bowl', name: 'Harvest Bowl', serving: '1 bowl', calories: 680, protein: 32, carbs: 64, fat: 34, aliases: ['sweetgreen', 'harvest bowl'] },
    { id: 'kale-caesar', name: 'Kale Caesar', serving: '1 bowl', calories: 520, protein: 36, carbs: 28, fat: 30 },
    { id: 'guacamole-greens', name: 'Guacamole Greens', serving: '1 bowl', calories: 540, protein: 28, carbs: 36, fat: 32 },
    { id: 'hot-honey', name: 'Hot Honey Chicken', serving: '1 bowl', calories: 620, protein: 38, carbs: 52, fat: 28 },
    { id: 'crispy-rice', name: 'Crispy Rice Bowl', serving: '1 bowl', calories: 700, protein: 30, carbs: 72, fat: 32 },
    { id: 'shroomami', name: 'Shroomami', serving: '1 bowl', calories: 580, protein: 18, carbs: 54, fat: 34 },
    { id: 'chicken', name: 'Blackened Chicken', serving: '1 serving', calories: 160, protein: 28, carbs: 1, fat: 4.5 },
    { id: 'tofu', name: 'Roasted Tofu', serving: '1 serving', calories: 140, protein: 14, carbs: 6, fat: 8 },
    { id: 'miso-vinaigrette', name: 'Creamy Sesame Dressing', serving: '1 serving', calories: 180, protein: 2, carbs: 6, fat: 16 },
  ]);

  // —— Buffalo Wild Wings ——
  chain('Buffalo Wild Wings', 'bww', [
    { id: 'traditional-wing', name: 'Traditional Wing, plain', serving: '1 wing', calories: 80, protein: 8, carbs: 0, fat: 5, aliases: ['buffalo wild wings', 'bww', 'bdub'] },
    { id: 'boneless', name: 'Boneless Wing, plain', serving: '1 piece', calories: 70, protein: 6, carbs: 5, fat: 3.5 },
    { id: 'traditional-medium', name: 'Traditional Wing Medium', serving: '1 wing', calories: 90, protein: 8, carbs: 1, fat: 5.5 },
    { id: 'traditional-asian-zinger', name: 'Traditional Wing Asian Zing', serving: '1 wing', calories: 100, protein: 8, carbs: 5, fat: 5 },
    { id: 'traditional-garlic', name: 'Traditional Wing Garlic Parmesan', serving: '1 wing', calories: 110, protein: 8, carbs: 1, fat: 8 },
    { id: 'traditional-mango', name: 'Traditional Wing Mango Habanero', serving: '1 wing', calories: 100, protein: 8, carbs: 4, fat: 5 },
    { id: 'tenders-3', name: 'Chicken Tenders', serving: '3 pieces', calories: 610, protein: 40, carbs: 36, fat: 34 },
    { id: 'fries', name: 'Seasoned Fries', serving: 'regular', calories: 420, protein: 5, carbs: 52, fat: 22 },
    { id: 'cheese-curds', name: 'Cheese Curds', serving: '1 order', calories: 930, protein: 36, carbs: 48, fat: 66 },
    { id: 'onion-rings', name: 'Onion Rings', serving: '1 order', calories: 890, protein: 10, carbs: 92, fat: 52 },
    { id: 'ranch', name: 'Ranch Dressing', serving: '1 cup', calories: 260, protein: 1, carbs: 3, fat: 27 },
    { id: 'burger', name: 'Cheeseburger', serving: '1 sandwich', calories: 880, protein: 44, carbs: 48, fat: 56 },
  ]);

  // —— IHOP ——
  chain('IHOP', 'ihop', [
    { id: 'buttermilk-pancakes', name: 'Buttermilk Pancakes', serving: '4 pancakes', calories: 620, protein: 16, carbs: 102, fat: 16, aliases: ['ihop', 'pancakes'] },
    { id: 'chocolate-chocolate-chip', name: 'Chocolate Chocolate Chip Pancakes', serving: '4 pancakes', calories: 870, protein: 16, carbs: 132, fat: 32 },
    { id: 'new-york-cheesecake', name: 'New York Cheesecake Pancakes', serving: '4 pancakes', calories: 980, protein: 20, carbs: 128, fat: 42 },
    { id: 'big-steak', name: 'Big Steak Omelette', serving: '1 omelette', calories: 1260, protein: 62, carbs: 28, fat: 98 },
    { id: 'split-decision', name: 'Split Decision Breakfast', serving: '1 plate', calories: 980, protein: 36, carbs: 88, fat: 52 },
    { id: 'chicken-avocado', name: 'Chicken & Avocado Bowl', serving: '1 bowl', calories: 720, protein: 42, carbs: 48, fat: 38 },
    { id: 'french-toast', name: "Stuffed French Toast", serving: '1 order', calories: 860, protein: 18, carbs: 112, fat: 36 },
    { id: 'hash-browns', name: 'Hash Browns', serving: '1 side', calories: 300, protein: 3, carbs: 28, fat: 20 },
    { id: 'bacon', name: 'Bacon', serving: '4 strips', calories: 180, protein: 12, carbs: 0, fat: 14 },
    { id: 'sausage', name: 'Pork Sausage Links', serving: '4 links', calories: 320, protein: 14, carbs: 2, fat: 28 },
    { id: 'coffee', name: 'Coffee', serving: '1 cup', calories: 5, protein: 0, carbs: 0, fat: 0 },
  ]);

  // —— Denny's ——
  chain("Denny's", 'dennys', [
    { id: 'grand-slam', name: 'Original Grand Slam', serving: '1 plate', calories: 980, protein: 42, carbs: 72, fat: 56, aliases: ["denny's", 'dennys', 'grand slam'] },
    { id: 'fit-slam', name: 'Fit Slam', serving: '1 plate', calories: 420, protein: 32, carbs: 40, fat: 14 },
    { id: 'moons-over-my-hammy', name: "Moons Over My Hammy", serving: '1 sandwich', calories: 960, protein: 48, carbs: 66, fat: 54 },
    { id: 'super-bird', name: 'Super Bird', serving: '1 sandwich', calories: 880, protein: 46, carbs: 62, fat: 48 },
    { id: 'bacon-avocado', name: 'Bacon Avocado Cheeseburger', serving: '1 sandwich', calories: 1120, protein: 52, carbs: 52, fat: 76 },
    { id: 'chicken-strips', name: 'Chicken Strips', serving: '1 order', calories: 780, protein: 38, carbs: 56, fat: 42 },
    { id: 'fries', name: 'French Fries', serving: '1 side', calories: 380, protein: 4, carbs: 48, fat: 18 },
    { id: 'moons-omelette', name: 'Loaded Veggie Omelette', serving: '1 omelette', calories: 620, protein: 32, carbs: 18, fat: 46 },
    { id: 'pancakes', name: 'Buttermilk Pancakes', serving: '3 pancakes', calories: 470, protein: 12, carbs: 78, fat: 12 },
  ]);

  // —— Papa John's ——
  chain("Papa John's", 'papajohns', [
    { id: 'cheese', name: 'Original Crust Cheese Pizza', serving: '1 slice (large)', calories: 290, protein: 12, carbs: 36, fat: 11, aliases: ["papa john's", 'papa johns', 'papajohns'] },
    { id: 'pepperoni', name: 'Original Crust Pepperoni Pizza', serving: '1 slice (large)', calories: 320, protein: 13, carbs: 36, fat: 14 },
    { id: 'the-works', name: 'The Works Pizza', serving: '1 slice (large)', calories: 330, protein: 13, carbs: 37, fat: 14 },
    { id: 'meat-lover', name: "Meat Lover's Pizza", serving: '1 slice (large)', calories: 370, protein: 16, carbs: 36, fat: 18 },
    { id: 'garlic-knots', name: 'Garlic Knots', serving: '1 order (8)', calories: 760, protein: 18, carbs: 92, fat: 34 },
    { id: 'breadsticks', name: 'Breadsticks', serving: '1 stick', calories: 140, protein: 4, carbs: 20, fat: 5 },
    { id: 'wings', name: 'Chicken Wings', serving: '2 pieces', calories: 180, protein: 16, carbs: 1, fat: 12 },
    { id: 'papadias', name: 'Papadias Italian Meats', serving: '1 papadia', calories: 780, protein: 32, carbs: 68, fat: 42 },
    { id: 'garlic-sauce', name: 'Special Garlic Sauce', serving: '1 cup', calories: 150, protein: 0, carbs: 1, fat: 16 },
  ]);

  // —— Little Caesars ——
  chain('Little Caesars', 'littlecaesars', [
    { id: 'hot-n-ready-pep', name: "Hot-N-Ready Pepperoni", serving: '1 slice', calories: 280, protein: 12, carbs: 30, fat: 12, aliases: ['little caesars', 'little caesars pizza', 'hot n ready'] },
    { id: 'hot-n-ready-cheese', name: 'Hot-N-Ready Cheese', serving: '1 slice', calories: 250, protein: 11, carbs: 30, fat: 10 },
    { id: 'extra-most-bestest', name: 'Extra Most Bestest Pepperoni', serving: '1 slice', calories: 320, protein: 14, carbs: 30, fat: 16 },
    { id: 'detroit', name: 'Detroit-Style Deep Dish Pepperoni', serving: '1 slice', calories: 400, protein: 16, carbs: 36, fat: 22 },
    { id: 'crazy-bread', name: 'Crazy Bread', serving: '1 stick', calories: 100, protein: 3, carbs: 15, fat: 3, aliases: ['little caesars', 'crazy bread'] },
    { id: 'crazy-sauce', name: 'Crazy Sauce', serving: '1 cup', calories: 40, protein: 1, carbs: 8, fat: 0 },
    { id: 'italian-cheese-bread', name: 'Italian Cheese Bread', serving: '1 stick', calories: 140, protein: 6, carbs: 14, fat: 6 },
    { id: 'wings', name: 'Oven Roasted Wings', serving: '1 wing', calories: 90, protein: 9, carbs: 0, fat: 6 },
  ]);

  // —— Cheesecake Factory ——
  chain('The Cheesecake Factory', 'cheesecakefactory', [
    { id: 'original-cheesecake', name: 'Original Cheesecake', serving: '1 slice', calories: 830, protein: 13, carbs: 67, fat: 56, aliases: ['cheesecake factory', 'cheesecake'] },
    { id: 'godiva', name: 'Godiva Chocolate Cheesecake', serving: '1 slice', calories: 1050, protein: 14, carbs: 92, fat: 70 },
    { id: 'louisiana-chicken', name: 'Louisiana Chicken Pasta', serving: '1 entree', calories: 2100, protein: 86, carbs: 128, fat: 134 },
    { id: 'chicken-madeira', name: 'Chicken Madeira', serving: '1 entree', calories: 1240, protein: 78, carbs: 72, fat: 68 },
    { id: 'bang-bang', name: 'Bang-Bang Chicken & Shrimp', serving: '1 entree', calories: 1480, protein: 64, carbs: 112, fat: 84 },
    { id: 'factory-burger', name: "Factory Topped Burger", serving: '1 sandwich', calories: 1360, protein: 62, carbs: 76, fat: 90 },
    { id: 'caesar', name: 'Caesar Salad with Chicken', serving: '1 salad', calories: 860, protein: 52, carbs: 28, fat: 60 },
    { id: 'avocado-egg-rolls', name: 'Avocado Egg Rolls', serving: '1 order', calories: 1150, protein: 16, carbs: 92, fat: 80 },
  ]);

  // —— In-N-Out expansion ——
  chain('In-N-Out', 'innout2', [
    { id: 'protein-style-burger', name: 'Hamburger, Protein Style', serving: '1 burger', calories: 240, protein: 13, carbs: 11, fat: 17, aliases: ['in-n-out', 'innout', 'protein style'] },
    { id: 'protein-style-cheese', name: 'Cheeseburger, Protein Style', serving: '1 burger', calories: 330, protein: 18, carbs: 11, fat: 25 },
    { id: 'animal-style-fries', name: 'Animal Style Fries', serving: '1 order', calories: 750, protein: 12, carbs: 72, fat: 46, aliases: ['in-n-out', 'animal style fries'] },
    { id: 'animal-style-burger', name: 'Cheeseburger, Animal Style', serving: '1 burger', calories: 570, protein: 28, carbs: 45, fat: 32, aliases: ['in-n-out', 'animal style'] },
    { id: '3x3', name: '3x3 Burger', serving: '1 burger', calories: 860, protein: 52, carbs: 41, fat: 54 },
    { id: '4x4', name: '4x4 Burger', serving: '1 burger', calories: 1050, protein: 67, carbs: 41, fat: 70 },
    { id: 'grilled-cheese', name: 'Grilled Cheese', serving: '1 sandwich', calories: 380, protein: 16, carbs: 39, fat: 18 },
    { id: 'shake-vanilla', name: 'Vanilla Shake', serving: '1 shake', calories: 590, protein: 14, carbs: 72, fat: 27 },
    { id: 'shake-chocolate', name: 'Chocolate Shake', serving: '1 shake', calories: 590, protein: 14, carbs: 72, fat: 27 },
    { id: 'shake-strawberry', name: 'Strawberry Shake', serving: '1 shake', calories: 590, protein: 14, carbs: 72, fat: 27 },
  ]);

  // —— Chick-fil-A wave-2-only items (base catalog already has nuggets/cobb/etc.) ——
  chain('Chick-fil-A', 'cfa3', [
    { id: 'spicy-deluxe', name: 'Spicy Deluxe Sandwich', serving: '1 sandwich', calories: 540, protein: 32, carbs: 48, fat: 24, aliases: ['chick-fil-a', 'chickfila', 'chick fil a'] },
    { id: 'cool-wrap', name: 'Grilled Cool Wrap', serving: '1 wrap', calories: 350, protein: 37, carbs: 29, fat: 14 },
    { id: 'spicy-southwest', name: 'Spicy Southwest Salad', serving: '1 salad', calories: 680, protein: 42, carbs: 36, fat: 42 },
    { id: 'nuggets-30', name: 'Chicken Nuggets', serving: '30 pieces', calories: 950, protein: 100, carbs: 35, fat: 45 },
    { id: 'peach-milkshake', name: 'Peach Milkshake', serving: 'small', calories: 520, protein: 12, carbs: 78, fat: 18 },
    { id: 'fruit-cup', name: 'Fruit Cup', serving: 'medium', calories: 60, protein: 1, carbs: 14, fat: 0 },
    { id: 'greek-yogurt-parfait', name: 'Greek Yogurt Parfait', serving: '1 parfait', calories: 270, protein: 13, carbs: 47, fat: 4.5 },
  ]);

  // —— McDonald's extras ——
  chain("McDonald's", 'mcd2', [
    { id: 'quarter-pounder', name: 'Quarter Pounder with Cheese', serving: '1 sandwich', calories: 520, protein: 30, carbs: 42, fat: 26, aliases: ["mcdonald's", 'mcdonalds', 'quarter pounder', 'qp'] },
    { id: 'double-quarter', name: 'Double Quarter Pounder with Cheese', serving: '1 sandwich', calories: 740, protein: 48, carbs: 43, fat: 42 },
    { id: 'mcchicken', name: 'McChicken', serving: '1 sandwich', calories: 400, protein: 14, carbs: 41, fat: 21, aliases: ["mcdonald's", 'mcchicken'] },
    { id: 'filet-o-fish', name: 'Filet-O-Fish', serving: '1 sandwich', calories: 390, protein: 16, carbs: 39, fat: 19 },
    { id: 'spicy-crispy', name: 'Spicy Crispy Chicken Sandwich', serving: '1 sandwich', calories: 530, protein: 27, carbs: 48, fat: 24 },
    { id: 'nuggets-20', name: 'Chicken McNuggets', serving: '20 pieces', calories: 830, protein: 46, carbs: 52, fat: 50 },
    { id: 'happy-meal-nuggets', name: 'Happy Meal Nuggets', serving: '4 pieces + fries + drink', calories: 480, protein: 16, carbs: 62, fat: 18 },
    { id: 'sausage-burrito', name: 'Sausage Burrito', serving: '1 burrito', calories: 310, protein: 13, carbs: 28, fat: 17 },
    { id: 'hotcakes', name: 'Hotcakes', serving: '3 cakes', calories: 580, protein: 10, carbs: 98, fat: 16 },
    { id: 'apple-pie', name: 'Baked Apple Pie', serving: '1 pie', calories: 230, protein: 2, carbs: 33, fat: 11 },
    { id: 'mcflurry-oreo', name: 'Oreo McFlurry', serving: 'regular', calories: 510, protein: 11, carbs: 80, fat: 17, aliases: ["mcdonald's", 'mcflurry'] },
    { id: 'large-fries', name: 'French Fries', serving: 'large', calories: 480, protein: 6, carbs: 64, fat: 22 },
  ]);

  // —— Taco Bell extras ——
  chain('Taco Bell', 'tbell2', [
    { id: 'cantina-chicken', name: 'Cantina Chicken Bowl', serving: '1 bowl', calories: 520, protein: 28, carbs: 58, fat: 18, aliases: ['taco bell', 'tacobell'] },
    { id: 'crunchwrap', name: 'Crunchwrap Supreme', serving: '1 crunchwrap', calories: 530, protein: 16, carbs: 71, fat: 21, aliases: ['taco bell', 'crunchwrap'] },
    { id: 'chalupa-supreme', name: 'Chalupa Supreme Beef', serving: '1 chalupa', calories: 350, protein: 12, carbs: 30, fat: 20 },
    { id: 'mexican-pizza', name: 'Mexican Pizza', serving: '1 pizza', calories: 470, protein: 17, carbs: 42, fat: 26 },
    { id: 'quesadilla-chicken', name: 'Chicken Quesadilla', serving: '1 quesadilla', calories: 520, protein: 27, carbs: 39, fat: 28 },
    { id: 'nacho-fries', name: 'Nacho Fries', serving: '1 regular', calories: 320, protein: 4, carbs: 36, fat: 18 },
    { id: 'cinnamon-twists', name: 'Cinnamon Twists', serving: '1 serving', calories: 170, protein: 1, carbs: 26, fat: 7 },
    { id: 'baja-blast', name: 'Baja Blast Freeze', serving: '1 regular', calories: 190, protein: 0, carbs: 50, fat: 0, aliases: ['taco bell', 'baja blast'] },
    { id: 'power-menu-bowl', name: 'Power Menu Bowl Chicken', serving: '1 bowl', calories: 470, protein: 26, carbs: 42, fat: 22 },
    { id: 'soft-taco-chicken', name: 'Chicken Soft Taco', serving: '1 taco', calories: 160, protein: 11, carbs: 18, fat: 5 },
  ]);

  // —— Subway wave-2-only ——
  chain('Subway', 'subway3', [
    { id: 'rotisserie', name: 'Rotisserie-Style Chicken (6")', serving: '6-inch', calories: 330, protein: 28, carbs: 46, fat: 5, aliases: ['subway'] },
    { id: 'meatball-footlong', name: 'Meatball Marinara (Footlong)', serving: 'footlong', calories: 960, protein: 42, carbs: 108, fat: 36 },
    { id: 'southwest-chicken', name: 'Southwest Chipotle Chicken Melt (6")', serving: '6-inch', calories: 460, protein: 28, carbs: 48, fat: 16 },
    { id: 'flatbread-turkey', name: 'Turkey Flatbread', serving: '1 flatbread', calories: 340, protein: 22, carbs: 40, fat: 10 },
  ]);

  // —— Qdoba extras ——
  chain('Qdoba', 'qdoba2', [
    { id: 'chicken-bowl', name: 'Chicken Bowl (typical)', serving: '1 bowl', calories: 740, protein: 44, carbs: 72, fat: 28, aliases: ['qdoba'] },
    { id: 'street-taco', name: 'Street Taco Chicken', serving: '1 taco', calories: 180, protein: 12, carbs: 16, fat: 8 },
    { id: 'quesadilla', name: 'Chicken Quesadilla', serving: '1 quesadilla', calories: 860, protein: 48, carbs: 58, fat: 46 },
    { id: 'nachos', name: 'Chicken Nachos', serving: '1 order', calories: 1180, protein: 52, carbs: 88, fat: 68 },
    { id: 'tortilla-soup', name: 'Tortilla Soup', serving: '1 cup', calories: 120, protein: 5, carbs: 14, fat: 5 },
  ]);

  // —— Trader Joe's extras ——
  chain("Trader Joe's", 'tj2', [
    { id: 'mandarin-orange-chicken', name: 'Mandarin Orange Chicken', serving: '1 cup prepared', calories: 340, protein: 14, carbs: 36, fat: 15, aliases: ["trader joe's", 'trader joes', 'orange chicken'] },
    { id: 'gyoza', name: 'Chicken Gyoza Potstickers', serving: '4 pieces', calories: 180, protein: 8, carbs: 24, fat: 6 },
    { id: 'cauliflower-gnocchi', name: 'Cauliflower Gnocchi', serving: '1 cup', calories: 140, protein: 2, carbs: 22, fat: 5, aliases: ["trader joe's", 'cauliflower gnocchi'] },
    { id: 'expecting-pasta', name: 'Expecting Pasta Sauce', serving: '1/2 cup', calories: 70, protein: 2, carbs: 10, fat: 2.5 },
    { id: 'soy-chorizo', name: 'Soy Chorizo', serving: '2.5 oz', calories: 170, protein: 12, carbs: 8, fat: 10 },
    { id: 'hold-the-cones', name: 'Hold the Cones Mini Ice Cream', serving: '4 cones', calories: 260, protein: 4, carbs: 32, fat: 13 },
    { id: 'dark-chocolate-peanut', name: 'Dark Chocolate Covered Peanuts', serving: '1/4 cup', calories: 210, protein: 5, carbs: 18, fat: 14 },
    { id: 'everything-but-bagel', name: 'Everything but the Bagel Seasoning', serving: '1/4 tsp', calories: 0, protein: 0, carbs: 0, fat: 0 },
    { id: 'hashbrowns', name: 'Hashbrowns', serving: '2 pieces', calories: 140, protein: 2, carbs: 16, fat: 8 },
    { id: 'burrito', name: 'Bean & Cheese Burrito', serving: '1 burrito', calories: 350, protein: 12, carbs: 52, fat: 10 },
    { id: 'chicken-tikka', name: 'Chicken Tikka Masala', serving: '1 cup', calories: 320, protein: 18, carbs: 28, fat: 14 },
    { id: 'elote', name: 'Elote Corn Chip Dippers', serving: '1 oz', calories: 140, protein: 2, carbs: 17, fat: 7 },
  ]);

  // —— Costco / Kirkland wave-2-only ——
  chain('Costco', 'costco3', [
    { id: 'muffin', name: 'Chocolate Chunk Muffin', serving: '1 muffin', calories: 610, protein: 8, carbs: 82, fat: 28, aliases: ['costco'] },
    { id: 'caesar-salad', name: 'Food Court Caesar Salad', serving: '1 salad', calories: 420, protein: 18, carbs: 20, fat: 30 },
  ]);

  chain('Kirkland', 'kirkland3', [
    { id: 'protein-bar-brownie', name: 'Protein Bar Chocolate Brownie', serving: '1 bar', calories: 180, protein: 21, carbs: 22, fat: 5, aliases: ['kirkland', 'costco'] },
    { id: 'organic-peanut-butter', name: 'Organic Peanut Butter', serving: '2 tbsp', calories: 190, protein: 8, carbs: 7, fat: 16 },
    { id: 'mixed-nuts', name: 'Extra Fancy Mixed Nuts', serving: '1 oz', calories: 180, protein: 5, carbs: 6, fat: 16 },
    { id: 'cottage-cheese', name: 'Cottage Cheese Low Fat', serving: '1/2 cup', calories: 90, protein: 13, carbs: 5, fat: 2.5 },
    { id: 'salmon', name: 'Atlantic Salmon Fillet', serving: '4 oz cooked', calories: 230, protein: 25, carbs: 0, fat: 14 },
    { id: 'olive-oil', name: 'Organic Extra Virgin Olive Oil', serving: '1 tbsp', calories: 120, protein: 0, carbs: 0, fat: 14 },
  ]);

  // —— Protein / supplement brands ——
  chain('Optimum Nutrition', 'on', [
    { id: 'gold-standard-double-rich', name: 'Gold Standard Whey Double Rich Chocolate', serving: '1 scoop (30.4 g)', calories: 120, protein: 24, carbs: 3, fat: 1.5, aliases: ['optimum nutrition', 'gold standard', 'on whey', 'whey'] },
    { id: 'gold-standard-vanilla', name: 'Gold Standard Whey Vanilla Ice Cream', serving: '1 scoop', calories: 120, protein: 24, carbs: 3, fat: 1 },
    { id: 'gold-standard-cookies', name: 'Gold Standard Whey Cookies & Cream', serving: '1 scoop', calories: 120, protein: 24, carbs: 4, fat: 1.5 },
    { id: 'serious-mass', name: 'Serious Mass Chocolate', serving: '1 scoop', calories: 630, protein: 25, carbs: 126, fat: 5.5 },
    { id: 'casein', name: 'Gold Standard Casein Chocolate', serving: '1 scoop', calories: 120, protein: 24, carbs: 3, fat: 1 },
  ]);

  chain('Ghost', 'ghost', [
    { id: 'whey-cereal-milk', name: 'Whey Cereal Milk', serving: '1 scoop', calories: 130, protein: 25, carbs: 3, fat: 2, aliases: ['ghost', 'ghost whey'] },
    { id: 'whey-chips-ahoy', name: 'Whey Chips Ahoy', serving: '1 scoop', calories: 130, protein: 25, carbs: 4, fat: 2 },
    { id: 'whey-oreo', name: 'Whey Oreo', serving: '1 scoop', calories: 130, protein: 25, carbs: 4, fat: 2 },
    { id: 'legend-v3', name: 'Legend V3 Sour Patch Kids', serving: '1 scoop', calories: 10, protein: 0, carbs: 2, fat: 0 },
  ]);

  chain('Quest', 'quest2', [
    { id: 'bar-cookies-cream', name: 'Protein Bar Cookies & Cream', serving: '1 bar', calories: 200, protein: 21, carbs: 21, fat: 8, aliases: ['quest', 'quest bar'] },
    { id: 'bar-chocolate-chip', name: 'Protein Bar Chocolate Chip Cookie Dough', serving: '1 bar', calories: 200, protein: 21, carbs: 21, fat: 8 },
    { id: 'bar-samoas', name: 'Protein Bar Coconut Cashew', serving: '1 bar', calories: 200, protein: 20, carbs: 22, fat: 8 },
    { id: 'hero-bar', name: 'Hero Bar Blueberry Cobbler', serving: '1 bar', calories: 160, protein: 16, carbs: 26, fat: 6 },
    { id: 'nacho-chips', name: 'Protein Chips Nacho Cheese', serving: '1 bag', calories: 140, protein: 18, carbs: 5, fat: 4.5 },
    { id: 'bbq-chips', name: 'Protein Chips BBQ', serving: '1 bag', calories: 140, protein: 18, carbs: 5, fat: 4.5 },
    { id: 'tortilla-chips', name: 'Tortilla Style Protein Chips', serving: '1 bag', calories: 140, protein: 18, carbs: 5, fat: 4.5 },
    { id: 'cookie', name: 'Frosted Cookies Birthday Cake', serving: '1 cookie', calories: 250, protein: 15, carbs: 24, fat: 13 },
    { id: 'pizza', name: 'Protein Pizza Uncured Pepperoni', serving: '1 pizza', calories: 360, protein: 30, carbs: 24, fat: 16 },
  ]);

  chain('Premier Protein', 'premier2', [
    { id: 'shake-caramel', name: 'Shake Caramel', serving: '1 shake (11 fl oz)', calories: 160, protein: 30, carbs: 4, fat: 3, aliases: ['premier protein', 'premier'] },
    { id: 'shake-cafe-latte', name: 'Shake Café Latte', serving: '1 shake', calories: 160, protein: 30, carbs: 4, fat: 3 },
    { id: 'shake-bananas', name: 'Shake Bananas & Cream', serving: '1 shake', calories: 160, protein: 30, carbs: 5, fat: 3 },
    { id: 'clear-drink', name: 'Clear Protein Drink Peach', serving: '1 bottle', calories: 90, protein: 20, carbs: 1, fat: 0 },
    { id: 'bar-chocolate', name: 'Protein Bar Chocolate Peanut Butter', serving: '1 bar', calories: 200, protein: 20, carbs: 22, fat: 7 },
  ]);

  chain('Fairlife', 'fairlife2', [
    { id: 'core-power-elite', name: 'Core Power Elite Chocolate', serving: '1 bottle (14 oz)', calories: 230, protein: 42, carbs: 8, fat: 4.5, aliases: ['fairlife', 'core power'] },
    { id: 'nutrition-plan', name: 'Nutrition Plan Chocolate', serving: '1 bottle', calories: 150, protein: 25, carbs: 4, fat: 2.5 },
    { id: 'milk-2', name: 'Ultra-Filtered 2% Milk', serving: '1 cup', calories: 120, protein: 13, carbs: 6, fat: 4.5 },
    { id: 'milk-chocolate', name: 'Core Power Chocolate', serving: '1 bottle (14 oz)', calories: 170, protein: 26, carbs: 8, fat: 4.5 },
    { id: 'yogurt', name: 'Greek Yogurt Plain', serving: '1 cup', calories: 120, protein: 20, carbs: 6, fat: 2 },
  ]);

  chain('Chobani', 'chobani2', [
    { id: 'zero-sugar', name: 'Zero Sugar Vanilla', serving: '1 cup (170 g)', calories: 60, protein: 12, carbs: 6, fat: 0, aliases: ['chobani', 'chobani zero'] },
    { id: 'complete', name: 'Complete Vanilla Vanilla', serving: '1 bottle', calories: 150, protein: 20, carbs: 15, fat: 2 },
    { id: 'drink', name: 'Drink Vanilla', serving: '1 bottle', calories: 120, protein: 10, carbs: 16, fat: 2 },
    { id: 'oat', name: 'Oat Blend Vanilla', serving: '1 cup', calories: 140, protein: 6, carbs: 22, fat: 3.5 },
    { id: 'flip-park', name: 'Flip Park Series Cookies & Cream', serving: '1 cup', calories: 190, protein: 11, carbs: 24, fat: 6 },
    { id: 'less-sugar', name: 'Less Sugar Mexican-Style Lime', serving: '1 cup', calories: 120, protein: 12, carbs: 13, fat: 3 },
  ]);

  chain('Oikos', 'oikos2', [
    { id: 'pro-vanilla', name: 'Pro Vanilla', serving: '1 cup (160 g)', calories: 140, protein: 20, carbs: 13, fat: 2, aliases: ['oikos', 'oikos pro'] },
    { id: 'pro-chocolate', name: 'Pro Chocolate', serving: '1 cup', calories: 150, protein: 20, carbs: 15, fat: 2 },
    { id: 'triple-zero-vanilla', name: 'Triple Zero Vanilla', serving: '1 cup (150 g)', calories: 90, protein: 15, carbs: 9, fat: 0 },
    { id: 'triple-zero-blueberry', name: 'Triple Zero Blueberry', serving: '1 cup', calories: 90, protein: 15, carbs: 10, fat: 0 },
    { id: 'triple-zero-strawberry', name: 'Triple Zero Strawberry', serving: '1 cup', calories: 90, protein: 15, carbs: 10, fat: 0 },
  ]);

  chain('Fage', 'fage2', [
    { id: 'total-0', name: 'Total 0%', serving: '1 cup (227 g)', calories: 130, protein: 23, carbs: 9, fat: 0, aliases: ['fage', 'fage total'] },
    { id: 'total-2', name: 'Total 2%', serving: '1 cup', calories: 170, protein: 20, carbs: 8, fat: 5 },
    { id: 'total-5', name: 'Total 5%', serving: '1 cup', calories: 220, protein: 18, carbs: 6, fat: 12 },
    { id: 'bestself', name: 'BestSelf Vanilla', serving: '1 cup', calories: 110, protein: 15, carbs: 12, fat: 0 },
  ]);

  // —— Grocery staples people type constantly ——
  [
    ['chicken-100g', 'Chicken breast, cooked', 'Generic', '100 g', 165, 31, 0, 3.6, ['chicken', 'chicken breast', '100g chicken']],
    ['rice-100g', 'White rice, cooked', 'Generic', '100 g', 130, 2.7, 28, 0.3, ['rice', '100g rice']],
    ['brown-rice-100g', 'Brown rice, cooked', 'Generic', '100 g', 123, 2.7, 25.6, 1, ['brown rice']],
    ['oats-40g', 'Oats, dry', 'Generic', '40 g', 150, 5, 27, 3, ['oats', 'oatmeal']],
    ['egg-50g', 'Egg, whole', 'Generic', '50 g (1 large)', 72, 6.3, 0.4, 4.8, ['egg', 'eggs']],
    ['banana-100g', 'Banana', 'Generic', '100 g', 89, 1.1, 23, 0.3, ['banana']],
    ['apple-100g', 'Apple', 'Generic', '100 g', 52, 0.3, 14, 0.2, ['apple']],
    ['broccoli-100g', 'Broccoli, cooked', 'Generic', '100 g', 35, 2.4, 7, 0.4, ['broccoli']],
    ['salmon-100g', 'Salmon, cooked', 'Generic', '100 g', 206, 22, 0, 13, ['salmon']],
    ['beef-100g', 'Ground beef 90% lean, cooked', 'Generic', '100 g', 217, 26, 0, 12, ['ground beef', 'beef']],
    ['turkey-100g', 'Turkey breast, cooked', 'Generic', '100 g', 135, 30, 0, 1, ['turkey']],
    ['potato-100g', 'Potato, baked', 'Generic', '100 g', 93, 2.5, 21, 0.1, ['potato']],
    ['sweet-potato-100g', 'Sweet potato, baked', 'Generic', '100 g', 90, 2, 21, 0.2, ['sweet potato']],
    ['pasta-100g', 'Pasta, cooked', 'Generic', '100 g', 131, 5, 25, 1.1, ['pasta']],
    ['bread-slice-28g', 'Whole wheat bread', 'Generic', '28 g (1 slice)', 70, 3.5, 12, 1, ['bread']],
    ['avocado-50g', 'Avocado', 'Generic', '50 g', 80, 1, 4, 7.5, ['avocado']],
    ['olive-oil-14g', 'Olive oil', 'Generic', '14 g (1 tbsp)', 120, 0, 0, 14, ['olive oil', 'oil']],
    ['pb-32g', 'Peanut butter', 'Generic', '32 g (2 tbsp)', 190, 8, 7, 16, ['pb', 'peanut butter']],
    ['greek-yogurt-170g', 'Greek yogurt, nonfat', 'Generic', '170 g', 100, 17, 6, 0.7, ['greek yogurt', 'yogurt']],
    ['cottage-113g', 'Cottage cheese, lowfat', 'Generic', '113 g (1/2 cup)', 90, 13, 5, 2.5, ['cottage cheese', 'cottage']],
    ['cheddar-28g', 'Cheddar cheese', 'Generic', '28 g (1 oz)', 115, 7, 0.4, 9.5, ['cheddar', 'cheese']],
    ['almonds-28g', 'Almonds', 'Generic', '28 g', 160, 6, 6, 14, ['almonds']],
    ['whey-30g', 'Whey protein isolate', 'Generic', '30 g scoop', 110, 25, 1, 0.5, ['whey', 'protein powder', 'protein shake']],
    ['tofu-100g', 'Tofu, firm', 'Generic', '100 g', 144, 17, 3, 9, ['tofu']],
    ['shrimp-100g', 'Shrimp, cooked', 'Generic', '100 g', 99, 24, 0.2, 0.3, ['shrimp']],
    ['tuna-100g', 'Tuna, canned in water', 'Generic', '100 g', 86, 19, 0, 1, ['tuna']],
    ['milk-244g', 'Milk, 2%', 'Generic', '244 g (1 cup)', 122, 8, 12, 4.8, ['milk']],
    ['butter-14g', 'Butter', 'Generic', '14 g (1 tbsp)', 102, 0.1, 0, 11.5, ['butter']],
    ['honey-21g', 'Honey', 'Generic', '21 g (1 tbsp)', 64, 0, 17, 0, ['honey']],
    ['rice-cake-9g', 'Rice cake', 'Generic', '9 g', 35, 0.7, 7, 0.3, ['rice cake']],
  ].forEach((row) => staple(...row));

  // —— More everyday generics ——
  [
    ['protein-coffee', 'Protein coffee', 'Generic', '1 cup', 100, 15, 4, 1.5, ['proffee', 'protein coffee']],
    ['cold-foam', 'Cold foam, sweet cream', 'Generic', '1 serving', 70, 1, 8, 4],
    ['everything-bagel', 'Everything bagel', 'Generic', '1 bagel', 290, 10, 56, 2.5, ['everything bagel']],
    ['bagel-cream-cheese', 'Bagel with cream cheese', 'Generic', '1 bagel', 390, 12, 58, 12],
    ['acai-packet', 'Acai puree unsweetened', 'Generic', '100 g', 70, 1, 4, 5, ['acai']],
    ['kimchi', 'Kimchi', 'Generic', '1/2 cup', 25, 1, 4, 0.5, ['kimchi']],
    ['sauerkraut', 'Sauerkraut', 'Generic', '1/2 cup', 20, 1, 4, 0],
    ['pickles', 'Dill pickles', 'Generic', '2 spears', 10, 0, 2, 0, ['pickle', 'pickles']],
    ['olives', 'Olives, green', 'Generic', '5 olives', 40, 0, 1, 4],
    ['sunflower-seeds', 'Sunflower seeds', 'Generic', '1 oz', 165, 5.5, 7, 14],
    ['pumpkin-seeds-raw', 'Pumpkin seeds', 'Generic', '1 oz', 150, 7, 5, 13, ['pepitas']],
    ['chia-pudding', 'Chia pudding', 'Generic', '1 cup', 250, 8, 28, 12],
    ['overnight-oats-pb', 'Overnight oats with peanut butter', 'Generic', '1 jar', 420, 18, 52, 16],
    ['smoothie-protein', 'Protein smoothie', 'Generic', '16 fl oz', 280, 30, 28, 6, ['protein smoothie']],
    ['green-smoothie', 'Green smoothie', 'Generic', '16 fl oz', 180, 6, 36, 2],
    ['poke-bowl', 'Poke bowl, salmon', 'Generic', '1 bowl', 550, 32, 58, 18, ['poke']],
    ['chipotle-style-bowl', 'Chicken rice bowl', 'Generic', '1 bowl', 680, 42, 70, 22],
    ['burger-no-bun', 'Cheeseburger, no bun', 'Generic', '1 burger', 350, 28, 2, 26, ['protein style burger']],
    ['chicken-wrap', 'Grilled chicken wrap', 'Generic', '1 wrap', 420, 32, 36, 16],
    ['turkey-wrap', 'Turkey wrap', 'Generic', '1 wrap', 380, 28, 34, 14],
    ['caesar-salad-chicken', 'Chicken Caesar salad', 'Generic', '1 salad', 470, 36, 14, 30],
    ['cobb-salad', 'Cobb salad', 'Generic', '1 salad', 580, 38, 16, 40],
    ['greek-salad', 'Greek salad with chicken', 'Generic', '1 salad', 420, 34, 18, 24],
    ['ramen-cup-low', 'Instant ramen, drained', 'Generic', '1 package', 280, 7, 40, 10],
    ['frozen-burrito-bean', 'Bean burrito, frozen', 'Generic', '1 burrito', 320, 11, 50, 8],
    ['lean-cuisine', 'Lean Cuisine frozen meal', 'Generic', '1 meal', 280, 18, 36, 6],
    ['healthy-choice', 'Healthy Choice frozen meal', 'Generic', '1 meal', 300, 20, 38, 7],
    ['hello-fresh-avg', 'HelloFresh meal (typical plate)', 'Generic', '1 serving', 650, 35, 55, 28, ['hello fresh']],
    ['factor-meal', 'Factor meal (typical)', 'Generic', '1 meal', 550, 35, 35, 28, ['factor']],
    ['trifecta-meal', 'Trifecta meal (typical)', 'Generic', '1 meal', 500, 40, 35, 20, ['trifecta']],
    ['chipotle-vinaigrette', 'Chipotle vinaigrette-style dressing', 'Generic', '2 tbsp', 120, 0, 4, 11],
    ['blue-cheese-dressing', 'Blue cheese dressing', 'Generic', '2 tbsp', 140, 1, 1, 15],
    ['thousand-island', 'Thousand Island dressing', 'Generic', '2 tbsp', 120, 0, 6, 11],
    ['soy-sauce-tbsp', 'Soy sauce', 'Generic', '1 tbsp', 10, 1, 1, 0, ['soy sauce']],
    ['teriyaki-sauce', 'Teriyaki sauce', 'Generic', '2 tbsp', 50, 1, 10, 0],
    ['hot-honey', 'Hot honey', 'Generic', '1 tbsp', 60, 0, 16, 0],
    ['everything-seasoning', 'Everything bagel seasoning', 'Generic', '1 tsp', 5, 0, 1, 0],
    ['nutritional-yeast', 'Nutritional yeast', 'Generic', '2 tbsp', 40, 5, 4, 0.5, ['nooch']],
    ['collagen', 'Collagen peptides', 'Generic', '1 scoop (11 g)', 40, 10, 0, 0, ['collagen']],
    ['creatine', 'Creatine monohydrate', 'Generic', '5 g', 0, 0, 0, 0, ['creatine']],
    ['electrolyte-packet', 'Electrolyte packet', 'Generic', '1 packet', 15, 0, 3, 0, ['lmnt', 'liquid iv']],
    ['liquid-iv', 'Liquid I.V. Hydration Multiplier', 'Liquid I.V.', '1 stick', 45, 0, 11, 0, ['liquid iv']],
    ['lmnt', 'LMNT Electrolyte Drink Mix', 'LMNT', '1 packet', 10, 0, 2, 0, ['lmnt']],
    ['celsius', 'Celsius Energy Drink', 'Celsius', '12 fl oz', 10, 0, 0, 0, ['celsius']],
    ['prime-drink', 'PRIME Hydration', 'PRIME', '16.9 fl oz', 25, 0, 3, 0, ['prime']],
    ['poppi', 'Poppi Prebiotic Soda', 'Poppi', '12 fl oz', 25, 0, 5, 0, ['poppi']],
    ['olipop', 'Olipop Prebiotic Soda', 'Olipop', '12 fl oz', 35, 0, 16, 0, ['olipop']],
    ['hint-water', 'Hint Water', 'Hint', '16 fl oz', 0, 0, 0, 0, ['hint']],
    ['la-croix', 'La Croix Sparkling Water', 'La Croix', '12 fl oz', 0, 0, 0, 0, ['la croix', 'lacroix']],
    ['topo-chico', 'Topo Chico', 'Topo Chico', '12 fl oz', 0, 0, 0, 0, ['topo chico']],
  ].forEach((row) => staple(...row));

  // —— Breakfast cereals & bars people log ——
  [
    ['protein-oats', 'Protein oatmeal', 'Generic', '1 cup prepared', 220, 15, 32, 4],
    ['overnight-protein-oats', 'Protein overnight oats', 'Generic', '1 jar', 350, 28, 40, 8],
    ['kodiak-pancake', 'Kodiak Cakes Power Cakes', 'Kodiak', '1/2 cup dry', 190, 14, 30, 2, ['kodiak', 'kodiak cakes']],
    ['kodiak-waffle', 'Kodiak Cakes Frozen Waffle', 'Kodiak', '2 waffles', 180, 12, 26, 4],
    ['eggo', 'Eggo Homestyle Waffles', 'Eggo', '2 waffles', 180, 4, 27, 6, ['eggo']],
    ['jimmy-dean-scramble', 'Jimmy Dean Delights Scramble', 'Jimmy Dean', '1 bowl', 250, 16, 16, 14, ['jimmy dean']],
    ['turkey-sausage-patty', 'Turkey sausage patty', 'Generic', '1 patty', 80, 9, 0, 5],
    ['chicken-sausage', 'Chicken sausage link', 'Generic', '1 link', 90, 9, 2, 5],
    ['rxbar-chocolate', 'RXBAR Chocolate Sea Salt', 'RXBAR', '1 bar', 210, 12, 23, 9, ['rxbar']],
    ['kind-dark', 'KIND Dark Chocolate Nuts & Sea Salt', 'KIND', '1 bar', 200, 6, 16, 15, ['kind bar']],
    ['clif-chocolate', 'CLIF Bar Chocolate Chip', 'Clif', '1 bar', 250, 9, 45, 5, ['clif bar']],
    ['luna-bar', 'LUNA Bar Lemon Zest', 'LUNA', '1 bar', 180, 6, 27, 5],
    ['nature-valley', 'Nature Valley Crunchy Oats n Honey', 'Nature Valley', '2 bars', 190, 3, 29, 7],
    ['granola-bar', 'Granola bar, chewy chocolate chip', 'Generic', '1 bar', 140, 2, 24, 4],
  ].forEach((row) => staple(...row));

  // Ensure `add` is referenced so unused-param lint stays quiet if tree-shaken later
  void add;
}
