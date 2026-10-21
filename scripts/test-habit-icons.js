import assert from 'node:assert/strict';
import { colorForHabit, iconForHabit } from '../src/lib/habitIcons.js';

const cases = [
  ['Weigh in', 'scale'],
  ['Water', 'droplet'],
  ['Walk after meals', 'footprints'],
  ['Bible', 'book'],
  ['Read', 'book'],
  ['Sleep', 'moon'],
  ['Move My Body', 'dumbbell'],
  ['Lift', 'dumbbell'],
  ['Whole foods', 'leaf'],
  ['Protein', 'apple'],
  ['Track Everything I eat', 'apple'],
  ['Mystery', 'check'],
];

for (const [name, icon] of cases) {
  assert.equal(iconForHabit({ name, emoji: '🥦' }), icon, name);
}

assert.equal(iconForHabit({ name: 'Weigh in', icon: 'heart' }), 'heart');
assert.equal(iconForHabit({ name: 'Weigh in', icon: 'not-real' }), 'scale');
assert.equal(colorForHabit({ name: 'Sleep' }), 'purple');
assert.equal(colorForHabit({ name: 'Sleep', color: 'pink' }), 'pink');
assert.equal(colorForHabit({ name: 'Mystery' }), 'gray');

console.log('habit icons ok');
