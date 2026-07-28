import { daysBetween, todayISO } from './dates';

/**
 * Gestational age derived from a due date.
 *
 * Pregnancy is dated from the last menstrual period, not conception, and a due
 * date is defined as 40 weeks from it — so weeks elapsed is just 40 weeks minus
 * the time left. That is the same arithmetic every clinic uses, which matters:
 * a number here that disagreed with the one at an appointment would be worse
 * than no number at all.
 *
 * This is a milestone view, not medical guidance. Nothing here should be read
 * as a substitute for what a midwife or doctor says.
 */

const TERM_DAYS = 280; // 40 weeks

export const TRIMESTERS = [
  { n: 1, label: 'First trimester', from: 1, to: 13 },
  { n: 2, label: 'Second trimester', from: 14, to: 27 },
  { n: 3, label: 'Third trimester', from: 28, to: 42 },
];

/** Weeks and days elapsed, the way it gets said out loud: "14 weeks, 3 days". */
export function gestation(dueDate, today = todayISO()) {
  const remaining = daysBetween(today, dueDate);
  const elapsed = TERM_DAYS - remaining;
  if (elapsed < 0) return null;
  return {
    days: elapsed,
    weeks: Math.floor(elapsed / 7),
    extraDays: elapsed % 7,
    remaining,
    overdue: remaining < 0,
  };
}

export function trimesterOf(weeks) {
  return TRIMESTERS.find((t) => weeks >= t.from && weeks <= t.to) || TRIMESTERS[0];
}

/**
 * Size comparisons and one plain note per week. Comparisons are the usual
 * produce ones because they are the ones people actually picture.
 */
const WEEKS = {
  4: ['a poppy seed', 'The embryo implants. The neural tube — brain and spinal cord — starts forming.'],
  5: ['a sesame seed', 'The heart begins to beat, though it is far too faint to hear yet.'],
  6: ['a lentil', 'Facial features start to form. Arm and leg buds appear.'],
  7: ['a blueberry', 'The brain is growing fast. Hands and feet emerge as paddles.'],
  8: ['a raspberry', 'Now officially a fetus. Fingers and toes are separating.'],
  9: ['a grape', 'Essential organs are all present. Tiny muscles allow the first movements.'],
  10: ['a kumquat', 'Vital organs are functioning. Fingernails and hair begin.'],
  11: ['a fig', 'Bones are hardening. The baby can hiccup, though you cannot feel it.'],
  12: ['a lime', 'Reflexes develop. The face looks distinctly human now.'],
  13: ['a pea pod', 'Vocal cords form. The end of the first trimester.'],
  14: ['a lemon', 'The baby can squint and frown. Fine hair called lanugo appears.'],
  15: ['an apple', 'Bones are getting denser. The baby may sense light through closed lids.'],
  16: ['an avocado', 'The heart pumps around 25 quarts of blood a day. Facial muscles work.'],
  17: ['a turnip', 'Fat stores begin forming. The skeleton shifts from cartilage to bone.'],
  18: ['a bell pepper', 'Hearing sharpens — the baby may start to register your voice.'],
  19: ['a mango', 'A waxy coating, vernix, protects the skin.'],
  20: ['a banana', 'Halfway. The anatomy scan usually happens around now.'],
  21: ['a carrot', 'Movements become coordinated kicks you can feel from outside.'],
  22: ['a papaya', 'Lips and eyebrows are distinct. The baby looks like a small newborn.'],
  23: ['a grapefruit', 'Skin is still translucent. The baby begins to hear loud outside noises.'],
  24: ['an ear of corn', 'Lungs develop branches. A viability milestone.'],
  25: ['a rutabaga', 'Hair is growing and has colour and texture.'],
  26: ['a scallion', 'Eyes begin to open. The baby responds to sound and touch.'],
  27: ['a cauliflower', 'Regular sleep and wake cycles begin. End of the second trimester.'],
  28: ['an eggplant', 'The baby can blink and may dream. Third trimester begins.'],
  29: ['a butternut squash', 'Muscles and lungs mature. Bones absorb a lot of calcium.'],
  30: ['a cabbage', 'Fluid decreases as the baby takes up more room.'],
  31: ['a coconut', 'All five senses are working. Rapid brain development.'],
  32: ['a squash', 'Toenails and real hair. The baby often moves head-down.'],
  33: ['a pineapple', 'Skull bones stay soft and separate to ease the passage out.'],
  34: ['a cantaloupe', 'Fat is filling in. Lungs are nearly ready.'],
  35: ['a honeydew', 'Most growth from here is weight, not length.'],
  36: ['romaine lettuce', 'The baby is likely settling head-down for good.'],
  37: ['swiss chard', 'Early term. Practising breathing, sucking, and blinking.'],
  38: ['a leek', 'Full term is close. Brain and lungs are still finishing.'],
  39: ['a small pumpkin', 'Full term. The baby keeps adding fat for warmth.'],
  40: ['a watermelon', 'Due now. Only about 1 in 20 arrive on the actual date.'],
  41: ['a watermelon', 'Late term. Your team will talk through next steps.'],
  42: ['a watermelon', 'Post term. Almost everyone has met their baby by now.'],
};

export function weekInfo(weeks) {
  const clamped = Math.max(4, Math.min(42, weeks));
  const [size, note] = WEEKS[clamped] || WEEKS[40];
  return { size, note, known: weeks >= 4 && weeks <= 42 };
}
