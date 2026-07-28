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
 * Per week: a size comparison, what is developing, and one concrete way to
 * serve her.
 *
 * The `serve` lines are deliberately specific and physical. "Be supportive" is
 * not an instruction anyone can act on at 9pm on a Tuesday; "put crackers on
 * her nightstand" is. Each is tied to what is typically happening that week, so
 * it lands as noticing rather than as a generic reminder to be nice.
 *
 * Typically. Every pregnancy differs, and none of this outranks asking her.
 */
const WEEKS = {
  4: ['a poppy seed', 'The embryo implants. The neural tube — brain and spinal cord — starts forming.',
    'Take the grocery run off her plate this week, and ask how she’s feeling without making it a big conversation.'],
  5: ['a sesame seed', 'The heart begins to beat, though it is far too faint to hear yet.',
    'Put crackers and water on her nightstand tonight. Nausea is often worst before she’s eaten anything.'],
  6: ['a lentil', 'Facial features start to form. Arm and leg buds appear.',
    'Smells are the trigger now. Cook with the fan on, take the trash out before it’s full, skip the cologne.'],
  7: ['a blueberry', 'The brain is growing fast. Hands and feet emerge as paddles.',
    'The exhaustion is real and invisible. Clear one obligation off her calendar without being asked.'],
  8: ['a raspberry', 'Now officially a fetus. Fingers and toes are separating.',
    'Take over dinner this week. Ask what sounds tolerable, not what sounds good.'],
  9: ['a grape', 'Essential organs are all present. Tiny muscles allow the first movements.',
    'She may be off foods she used to love. Don’t make her explain it — just quietly restock what works.'],
  10: ['a kumquat', 'Vital organs are functioning. Fingernails and hair begin.',
    'Book the appointment, drive to it, and write the questions down beforehand so she isn’t the only one holding them.'],
  11: ['a fig', 'Bones are hardening. The baby can hiccup, though you cannot feel it.',
    'Fatigue often peaks around now. Take the evening chores so she can go to bed early without guilt.'],
  12: ['a lime', 'Reflexes develop. The face looks distinctly human now.',
    'The first scan often falls near now. Be there, phone away, fully present.'],
  13: ['a pea pod', 'Vocal cords form. The end of the first trimester.',
    'Ask what she’s most nervous about — then just listen. Don’t rush to solve it.'],
  14: ['a lemon', 'The baby can squint and frown. Fine hair called lanugo appears.',
    'Energy often returns now. Plan something you both enjoy that has nothing to do with the baby.'],
  15: ['an apple', 'Bones are getting denser. The baby may sense light through closed lids.',
    'Round ligament pain starts. Take the heavy lifting off her permanently, not just when she asks.'],
  16: ['an avocado', 'The heart pumps around 25 quarts of blood a day. Facial muscles work.',
    'Her body is visibly changing. Tell her she’s beautiful, plainly and often, and mean it.'],
  17: ['a turnip', 'Fat stores begin forming. The skeleton shifts from cartilage to bone.',
    'Back pain sets in. Learn a proper lower-back rub and offer it before she has to ask.'],
  18: ['a bell pepper', 'Hearing sharpens — the baby may start to register your voice.',
    'Talk to the bump. It feels ridiculous for about three days and then it doesn’t.'],
  19: ['a mango', 'A waxy coating, vernix, protects the skin.',
    'Sleep is getting harder. Buy the pregnancy pillow this week instead of researching it for a month.'],
  20: ['a banana', 'Halfway. The anatomy scan usually happens around now.',
    'Halfway, and a big scan. Take the day off if you can. Hold her hand through it.'],
  21: ['a carrot', 'Movements become coordinated kicks you can feel from outside.',
    'She’ll feel kicks long before you can. Wait your turn patiently — don’t make her perform it for you.'],
  22: ['a papaya', 'Lips and eyebrows are distinct. The baby looks like a small newborn.',
    'Heartburn arrives. Move dinner earlier and stock whatever brings her relief.'],
  23: ['a grapefruit', 'Skin is still translucent. The baby begins to hear loud outside noises.',
    'Her feet are swelling. Rub them. No agenda, nothing expected back.'],
  24: ['an ear of corn', 'Lungs develop branches. A viability milestone.',
    'Start the birth plan conversation. Ask what she wants, then be the one who remembers it.'],
  25: ['a rutabaga', 'Hair is growing and has colour and texture.',
    'Take one piece of baby logistics start to finish — crib, car seat, registry — without a running commentary.'],
  26: ['a scallion', 'Eyes begin to open. The baby responds to sound and touch.',
    'She’s carrying more and sleeping worse. Own the early mornings so she can sleep in.'],
  27: ['a cauliflower', 'Regular sleep and wake cycles begin. End of the second trimester.',
    'Ask her directly what would help most right now. Then go do that specific thing.'],
  28: ['an eggplant', 'The baby can blink and may dream. Third trimester begins.',
    'Appointments get more frequent now. Put every one in your calendar, not hers.'],
  29: ['a butternut squash', 'Muscles and lungs mature. Bones absorb a lot of calcium.',
    'Ribs and hips ache. You handle anything that involves bending, lifting, or the floor.'],
  30: ['a cabbage', 'Fluid decreases as the baby takes up more room.',
    'Nesting energy is real. Say yes to the project instead of debating whether it’s necessary.'],
  31: ['a coconut', 'All five senses are working. Rapid brain development.',
    'Anxiety about labour climbs around now. Ask, listen, and don’t minimise it.'],
  32: ['a squash', 'Toenails and real hair. The baby often moves head-down.',
    'Pack the hospital bag together, and know exactly where it lives.'],
  33: ['a pineapple', 'Skull bones stay soft and separate to ease the passage out.',
    'Drive the route to the hospital and find the parking. Do a real dry run.'],
  34: ['a cantaloupe', 'Fat is filling in. Lungs are nearly ready.',
    'Sleep is broken. Offer to take the guest room so she can have the whole bed.'],
  35: ['a honeydew', 'Most growth from here is weight, not length.',
    'Cook and freeze a stack of meals for after. Future you will be extremely grateful.'],
  36: ['romaine lettuce', 'The baby is likely settling head-down for good.',
    'Sort your leave and tell work now. Don’t leave it to the last week.'],
  37: ['swiss chard', 'Early term. Practising breathing, sucking, and blinking.',
    'Keep your phone charged and loud, and the tank full. Be reachable at all times.'],
  38: ['a leek', 'Full term is close. Brain and lungs are still finishing.',
    'Waiting is its own strain. Don’t ask whether anything’s happening — she will tell you.'],
  39: ['a small pumpkin', 'Full term. The baby keeps adding fat for warmth.',
    'Be the buffer between her and every person texting “any news yet?”'],
  40: ['a watermelon', 'Due now. Only about 1 in 20 arrive on the actual date.',
    'If nothing happens today she may feel like she’s failing. She isn’t. Tell her that out loud.'],
  41: ['a watermelon', 'Late term. Your team will talk through next steps.',
    'Keep things calm and ordinary. Take her somewhere easy and undemanding.'],
  42: ['a watermelon', 'Post term. Almost everyone has met their baby by now.',
    'Stay close, stay ready, stay steady. Let her set the pace of the day.'],
};

export function weekInfo(weeks) {
  const clamped = Math.max(4, Math.min(42, weeks));
  const [size, note, serve] = WEEKS[clamped] || WEEKS[40];
  return { size, note, serve, known: weeks >= 4 && weeks <= 42 };
}
