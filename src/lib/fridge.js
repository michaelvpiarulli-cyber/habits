/**
 * Virtual fridge inventory — zones match a real kitchen (freezer + fridge
 * shelves / drawers / door), and kinds are the food types you glance for.
 */

function kept(list) {
  return (list || []).filter((row) => row && !row.deleted);
}

export const FRIDGE_ZONES = [
  ['freezer', 'Freezer'],
  ['fridge', 'Fridge shelves'],
  ['dairy', 'Dairy drawer'],
  ['produce', 'Produce drawer'],
  ['door', 'Door'],
];

export const FRIDGE_KINDS = [
  ['dairy', 'Dairy'],
  ['produce', 'Produce'],
  ['meat', 'Meat'],
  ['beverage', 'Drinks'],
  ['frozen', 'Frozen'],
  ['condiment', 'Condiments'],
  ['bakery', 'Bakery'],
  ['leftover', 'Leftovers'],
  ['other', 'Other'],
];

const ZONE_IDS = new Set(FRIDGE_ZONES.map(([id]) => id));
const KIND_IDS = new Set(FRIDGE_KINDS.map(([id]) => id));

/** Map leftover shopping-list aisle values onto fridge zones. */
const LEGACY_AISLE_TO_ZONE = {
  produce: 'produce',
  dairy: 'dairy',
  meat: 'fridge',
  bakery: 'fridge',
  frozen: 'freezer',
  pantry: 'fridge',
  beverages: 'fridge',
  household: 'door',
  other: 'fridge',
  freezer: 'freezer',
  fridge: 'fridge',
  door: 'door',
};

export function normalizeFridgeZone(zone) {
  if (ZONE_IDS.has(zone)) return zone;
  return LEGACY_AISLE_TO_ZONE[zone] || 'fridge';
}

export function normalizeFridgeKind(kind) {
  return KIND_IDS.has(kind) ? kind : 'other';
}

export function labelOfFridge(pairs, id) {
  return pairs.find(([value]) => value === id)?.[1] || id || '';
}

/**
 * Group in-stock items by zone. Out items (checked) sit aside so the open
 * fridge stays readable.
 */
export function groupFridgeItems(items) {
  const stocked = kept(items).filter((item) => !item.checked);
  const out = kept(items)
    .filter((item) => item.checked)
    .sort((a, b) =>
      (b.checkedAt || b.updatedAt || '').localeCompare(a.checkedAt || a.updatedAt || '')
    );

  const byZone = Object.fromEntries(FRIDGE_ZONES.map(([id]) => [id, []]));
  for (const item of stocked) {
    byZone[normalizeFridgeZone(item.zone || item.aisle)].push(item);
  }

  const byName = (a, b) => (a.name || '').localeCompare(b.name || '');
  const sections = FRIDGE_ZONES.map(([id, label]) => {
    const list = byZone[id].sort(byName);
    return { id, label, items: list };
  });

  return { sections, stocked, out };
}

const SEED_AT = '2026-09-27T12:00:00.000Z';

/** Stable ids so photo seeds merge cleanly and do not duplicate. */
function seed(id, fields) {
  return {
    id: `a11c0000-f01d-4000-8000-${String(id).padStart(12, '0')}`,
    deleted: false,
    createdAt: SEED_AT,
    updatedAt: SEED_AT,
    checked: false,
    checkedAt: null,
    notes: '',
    quantity: '',
    expiresOn: null,
    ...fields,
    zone: normalizeFridgeZone(fields.zone),
    kind: normalizeFridgeKind(fields.kind),
  };
}

/**
 * Inventory read from the kitchen photos — freezer, fridge shelves,
 * dairy drawer, produce drawer, and door.
 */
export const PHOTO_FRIDGE_ITEMS = [
  // —— Freezer ——
  seed(1, {
    name: 'Otter Pops Original',
    brand: 'Otter Pops',
    quantity: '80 count',
    zone: 'freezer',
    kind: 'frozen',
  }),
  seed(2, {
    name: 'Kodiak Cakes Frontier Favorite',
    brand: 'Kodiak',
    zone: 'freezer',
    kind: 'frozen',
  }),
  seed(3, {
    name: 'Caramelized Onion & Cheddar Chicken Burgers',
    brand: 'Amylu',
    quantity: 'organic',
    zone: 'freezer',
    kind: 'meat',
    expiresOn: '2026-07-08',
    notes: 'Use or freeze by date on box',
  }),
  seed(4, {
    name: 'Maple Chicken Patties',
    brand: 'Amylu',
    zone: 'freezer',
    kind: 'meat',
    expiresOn: '2026-11-02',
  }),
  seed(5, {
    name: 'Triple Berry Blend',
    brand: 'Sprouts',
    quantity: 'blueberries, blackberries, raspberries',
    zone: 'freezer',
    kind: 'produce',
  }),
  seed(6, {
    name: 'Chicken Parmesan',
    brand: 'Venterra',
    zone: 'freezer',
    kind: 'frozen',
    notes: '250 cal / serving',
  }),
  seed(7, {
    name: 'Buffalo Style Chicken Wings',
    zone: 'freezer',
    kind: 'meat',
    notes: '12g protein',
  }),
  seed(8, {
    name: 'Steak / bacon strips',
    quantity: 'bagged',
    zone: 'freezer',
    kind: 'meat',
  }),
  seed(9, {
    name: 'Extra meat portions',
    quantity: 'bagged',
    zone: 'freezer',
    kind: 'meat',
  }),
  seed(10, {
    name: 'Broccoli Cheddar Soup',
    brand: 'Panera Bread',
    zone: 'freezer',
    kind: 'leftover',
    notes: 'Yellow-lid container',
  }),
  seed(11, {
    name: 'Spicy Mango Smoothie Mix',
    zone: 'freezer',
    kind: 'frozen',
  }),
  seed(12, {
    name: 'Whole frozen chicken / large bag',
    quantity: '1',
    zone: 'freezer',
    kind: 'meat',
  }),
  seed(13, {
    name: 'Frozen pastry / cookie',
    zone: 'freezer',
    kind: 'bakery',
  }),
  seed(14, {
    name: 'Mixed vegetables',
    quantity: 'baby corn, carrots, broccoli, red pepper',
    zone: 'freezer',
    kind: 'produce',
  }),
  seed(15, {
    name: 'Green Beans',
    brand: "Trader Joe's",
    zone: 'freezer',
    kind: 'produce',
  }),
  seed(16, {
    name: 'Baked Potato Soup',
    brand: 'Panera Bread',
    zone: 'freezer',
    kind: 'leftover',
    notes: 'Green-lid container',
  }),
  seed(17, {
    name: 'Quesadilla Bites (3 Cheeses)',
    brand: 'Del Real',
    quantity: '32 pieces',
    zone: 'freezer',
    kind: 'frozen',
    notes: 'Gluten-free',
  }),
  seed(18, {
    name: 'Frozen pizza / tart',
    zone: 'freezer',
    kind: 'frozen',
  }),
  seed(19, {
    name: 'Palak Paneer',
    brand: "Trader Joe's",
    quantity: '10 oz',
    zone: 'freezer',
    kind: 'frozen',
  }),
  seed(20, {
    name: 'Power Flapjacks / Toaster Flapjacks',
    brand: 'Kodiak Cakes',
    zone: 'freezer',
    kind: 'frozen',
  }),
  seed(21, {
    name: 'Spicy Spuds',
    brand: "Trader Joe's",
    zone: 'freezer',
    kind: 'frozen',
    notes: 'Cheese, lime, onion, parmesan, cayenne',
  }),
  seed(22, {
    name: 'Loose Otter Pops',
    brand: 'Otter Pops',
    quantity: 'a few sleeves',
    zone: 'freezer',
    kind: 'frozen',
  }),
  seed(23, {
    name: 'Frozen bananas',
    quantity: 'small cluster',
    zone: 'freezer',
    kind: 'produce',
  }),
  seed(24, {
    name: 'Take Home Buffalo Style Wings',
    zone: 'freezer',
    kind: 'meat',
  }),
  seed(25, {
    name: 'Frozen waffles',
    zone: 'freezer',
    kind: 'frozen',
  }),
  seed(26, {
    name: 'Shiitake Mushroom Chicken',
    brand: "Trader Joe's",
    zone: 'freezer',
    kind: 'meat',
  }),
  seed(27, {
    name: 'Sauce / soup tub',
    zone: 'freezer',
    kind: 'leftover',
    notes: 'Clear tub with white lid',
  }),
  seed(28, {
    name: 'White freezer tray',
    zone: 'freezer',
    kind: 'other',
    notes: 'Under the ice packs',
  }),

  // —— Fridge shelves ——
  seed(30, {
    name: 'Sparkling Water Cherry Limeade',
    brand: 'Waterloo',
    quantity: '8-pack',
    zone: 'fridge',
    kind: 'beverage',
  }),
  seed(31, {
    name: 'Sparkling Water Guava Berry',
    brand: 'Waterloo',
    quantity: '8-pack',
    zone: 'fridge',
    kind: 'beverage',
  }),
  seed(32, {
    name: 'Ginger Ale mini cans',
    brand: 'Canada Dry',
    quantity: '10-pack',
    zone: 'fridge',
    kind: 'beverage',
    notes: 'Caffeine-free',
  }),
  seed(34, {
    name: 'Protein shakes (chocolate)',
    brand: 'Premier Protein',
    quantity: 'multi-pack',
    zone: 'fridge',
    kind: 'beverage',
  }),
  seed(35, {
    name: 'Apples',
    quantity: '3 lb bag',
    zone: 'fridge',
    kind: 'produce',
  }),
  seed(37, {
    name: 'Coffee Creamer Caramel Macchiato',
    brand: 'Chobani',
    zone: 'fridge',
    kind: 'dairy',
  }),
  seed(38, {
    name: 'Coffee Creamer Pumpkin Spice',
    brand: 'Chobani',
    zone: 'fridge',
    kind: 'dairy',
  }),
  seed(39, {
    name: 'Organic Orange Juice',
    brand: "Natalie's",
    zone: 'fridge',
    kind: 'beverage',
  }),
  seed(40, {
    name: 'Sweet Relish',
    brand: 'Mt. Olive',
    zone: 'fridge',
    kind: 'condiment',
  }),
  seed(41, {
    name: 'Diet Coke',
    brand: 'Coca-Cola',
    quantity: '2 L',
    zone: 'fridge',
    kind: 'beverage',
  }),
  seed(42, {
    name: 'Sour Cream',
    brand: 'Daisy',
    zone: 'fridge',
    kind: 'dairy',
  }),
  seed(43, {
    name: 'Nopalitos',
    brand: 'Doña Maria',
    zone: 'fridge',
    kind: 'condiment',
  }),
  seed(44, {
    name: 'Yellow Mustard',
    brand: 'Heinz',
    zone: 'fridge',
    kind: 'condiment',
  }),
  seed(45, {
    name: 'Ranch',
    brand: 'Hidden Valley',
    zone: 'fridge',
    kind: 'condiment',
  }),
  seed(46, {
    name: 'Red seedless grapes',
    brand: 'Harvest',
    quantity: 'bag',
    zone: 'fridge',
    kind: 'produce',
  }),
  seed(47, {
    name: 'Sliced bread',
    zone: 'fridge',
    kind: 'bakery',
  }),
  seed(48, {
    name: 'Butter (on plate)',
    zone: 'fridge',
    kind: 'dairy',
  }),
  seed(50, {
    name: 'Ginger Ale mini can',
    brand: 'Canada Dry',
    quantity: '7.5 fl oz',
    zone: 'fridge',
    kind: 'beverage',
    notes: 'Caffeine-free',
  }),
  seed(51, {
    name: 'Chargrilled Seasoned Chicken',
    quantity: '32 oz',
    zone: 'dairy',
    kind: 'meat',
    notes: 'Fully cooked · deli drawer',
  }),
  seed(52, {
    name: 'Sausages / bratwurst',
    quantity: '2',
    zone: 'dairy',
    kind: 'meat',
    notes: 'Vacuum-sealed pack in deli drawer',
  }),
  seed(53, {
    name: 'Homestyle Ranch',
    zone: 'fridge',
    kind: 'condiment',
  }),
  seed(54, {
    name: 'Unwell Hydration with Benefits',
    brand: 'Unwell',
    zone: 'fridge',
    kind: 'beverage',
    notes: 'Alex Cooper · electrolytes · B vitamins',
  }),
  seed(55, {
    name: 'Strawberries',
    quantity: 'basket',
    zone: 'fridge',
    kind: 'produce',
  }),
  seed(56, {
    name: 'Ketchup',
    zone: 'fridge',
    kind: 'condiment',
  }),
  seed(57, {
    name: 'Artisan / sourdough bread',
    zone: 'fridge',
    kind: 'bakery',
  }),
  seed(58, {
    name: 'Olipop',
    brand: 'Olipop',
    quantity: 'pack',
    zone: 'fridge',
    kind: 'beverage',
    notes: 'Teal box behind Canada Dry',
  }),
  seed(59, {
    name: 'Protein shakes Chocolate Peanut Butter',
    brand: 'Premier Protein',
    quantity: '4-pack',
    zone: 'fridge',
    kind: 'beverage',
  }),
  seed(60, {
    name: 'Lime juice',
    zone: 'fridge',
    kind: 'condiment',
  }),
  seed(61, {
    name: 'Hot sauce',
    zone: 'fridge',
    kind: 'condiment',
  }),
  seed(62, {
    name: 'Steak sauce',
    zone: 'fridge',
    kind: 'condiment',
  }),
  seed(63, {
    name: 'Kiwis',
    quantity: 'container',
    zone: 'fridge',
    kind: 'produce',
  }),
  seed(64, {
    name: 'Lemon',
    quantity: '1',
    zone: 'fridge',
    kind: 'produce',
  }),
  seed(65, {
    name: 'Hummus',
    zone: 'dairy',
    kind: 'condiment',
    notes: 'Green tub in bottom drawer',
  }),
  seed(66, {
    name: 'Salsa / jam',
    zone: 'door',
    kind: 'condiment',
    notes: 'Orange jar on door',
  }),
  seed(67, {
    name: 'Fairlife Nutrition Plan (chocolate)',
    brand: 'Fairlife',
    quantity: '30g protein bottles',
    zone: 'door',
    kind: 'beverage',
  }),

  // —— Dairy drawer ——
  seed(70, {
    name: 'Eggs',
    quantity: '~12',
    zone: 'dairy',
    kind: 'dairy',
  }),
  seed(71, {
    name: 'Oikos Pro Complete Protein Yogurt',
    brand: 'Oikos',
    quantity: '2 cups',
    zone: 'dairy',
    kind: 'dairy',
    notes: '20g protein',
  }),
  seed(72, {
    name: 'Butter with Canola Oil',
    brand: 'Land O Lakes',
    zone: 'dairy',
    kind: 'dairy',
  }),
  seed(73, {
    name: 'Salted Butter',
    brand: 'Great Value',
    quantity: '4 sticks',
    zone: 'dairy',
    kind: 'dairy',
  }),
  seed(74, {
    name: 'Original Cream Cheese',
    brand: 'Philadelphia',
    zone: 'dairy',
    kind: 'dairy',
  }),
  seed(75, {
    name: 'Whipped Cream Cheese',
    brand: 'Philadelphia',
    quantity: '1 tub',
    zone: 'dairy',
    kind: 'dairy',
  }),
  seed(76, {
    name: 'Sliced Swiss Cheese',
    brand: "Trader Joe's",
    quantity: '12 oz',
    zone: 'dairy',
    kind: 'dairy',
  }),
  seed(77, {
    name: 'Shredded Mozzarella',
    brand: 'Lucerne',
    zone: 'dairy',
    kind: 'dairy',
  }),
  seed(78, {
    name: 'Shredded Mild Cheddar',
    brand: 'Kraft',
    zone: 'dairy',
    kind: 'dairy',
  }),
  seed(79, {
    name: 'Shredded Parmesan',
    brand: 'Lucerne',
    zone: 'dairy',
    kind: 'dairy',
  }),
  seed(80, {
    name: 'Crumbled Feta',
    brand: "Trader Joe's",
    zone: 'dairy',
    kind: 'dairy',
  }),
  seed(81, {
    name: 'Traditional Crumbled Feta',
    brand: 'Athenos',
    zone: 'dairy',
    kind: 'dairy',
  }),
  seed(82, {
    name: 'Flour Tortillas',
    zone: 'dairy',
    kind: 'bakery',
  }),
  seed(83, {
    name: 'Romaine Hearts',
    zone: 'dairy',
    kind: 'produce',
  }),
  seed(84, {
    name: 'White cheese block',
    quantity: '1',
    zone: 'dairy',
    kind: 'dairy',
    notes: 'Small wrapped bar — Monterey Jack style',
  }),
  seed(85, {
    name: 'Lucerne cheese bag',
    brand: 'Lucerne',
    zone: 'dairy',
    kind: 'dairy',
  }),
  seed(86, {
    name: 'Green-lid jar',
    zone: 'dairy',
    kind: 'condiment',
  }),

  // —— Produce drawer ——
  seed(90, {
    name: 'Organic Carrots',
    brand: 'Bolthouse Farms',
    quantity: 'bag',
    zone: 'produce',
    kind: 'produce',
  }),
  seed(91, {
    name: 'Organic Tri-Color Bell Peppers',
    brand: "Trader Joe's",
    quantity: '3-pack',
    zone: 'produce',
    kind: 'produce',
  }),
  seed(92, {
    name: 'Tomato',
    quantity: '1 large',
    zone: 'produce',
    kind: 'produce',
  }),
  seed(93, {
    name: 'Red onion',
    quantity: '1',
    zone: 'produce',
    kind: 'produce',
  }),
  seed(94, {
    name: 'Extra tomatoes',
    quantity: 'grocery bag',
    zone: 'produce',
    kind: 'produce',
  }),
  seed(95, {
    name: 'Orange bell pepper',
    quantity: '1',
    zone: 'produce',
    kind: 'produce',
    notes: 'Loose in crisper',
  }),
];

export function starterFridgeItems() {
  return PHOTO_FRIDGE_ITEMS.map((item) => ({ ...item }));
}

/**
 * Merge photo-seeded items into a local list. Skips ids that already exist
 * (including soft-deleted tombstones) so a cleared item stays gone.
 */
export function mergePhotoFridge(existing) {
  const list = Array.isArray(existing) ? [...existing] : [];
  const ids = new Set(list.map((row) => row.id));
  const added = [];
  for (const seedItem of starterFridgeItems()) {
    if (ids.has(seedItem.id)) continue;
    list.push(seedItem);
    added.push(seedItem);
    ids.add(seedItem.id);
  }
  return { list, added };
}
