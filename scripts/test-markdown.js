import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { inlineTokens, listNumber, parseMarkdown, shouldSplitMarkdown } from '../src/lib/markdown.js';

function words(value) {
  return String(value || '').toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) || [];
}

/** Drop markers that become block type, indent, or a checkbox. Keep every other word. */
function stripMarkers(value) {
  return String(value || '')
    .replace(/```[\w-]*/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s*/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '');
}

function blockWords(blocks) {
  const parts = [];
  for (const block of blocks) {
    parts.push(block.content || '');
    const rows = block.props?.rows;
    if (Array.isArray(rows)) parts.push(rows.flat().join(' '));
  }
  return words(parts.join('\n'));
}

function textOf(tokens) {
  return tokens.map((token) => {
    if (token.type === 'text' || token.type === 'code' || token.type === 'link') return token.text;
    if (token.children) return textOf(token.children);
    return '';
  }).join('');
}

const sample = `
# Title

**Bold lead.**

## Rules

1. **Show up.** Keep going.
2. Second item

- Parent
  - Nested child
    - Deeper

- [ ] Open task
- [x] Done task

> A quoted line
> still quoted

\`\`\`js
const n = 1;
# not a heading
\`\`\`

---

| Phase | Goal |
| --- | --- |
| **Launch** | 246 to 235 |
| Hold | 228 |

See [the notes](https://example.com/plan) and *I'm glad I did it*, or *I wish I'd started sooner.*

A snake_case word stays whole.
`;

const blocks = parseMarkdown(sample);
const types = blocks.map((block) => block.type);
assert.deepEqual(types, [
  'h1', 'text', 'h2', 'numbered', 'numbered',
  'bullet', 'bullet', 'bullet', 'todo', 'todo',
  'quote', 'code', 'divider', 'table', 'text', 'text',
]);

assert.equal(blocks[0].content, 'Title');
assert.equal(blocks[2].content, 'Rules');
assert.equal(blocks[3].content, '**Show up.** Keep going.');
assert.equal(blocks[5].props.indent || 0, 0);
assert.equal(blocks[6].props.indent, 1);
assert.equal(blocks[7].props.indent, 2);
assert.equal(blocks[8].checked, false);
assert.equal(blocks[9].checked, true);
assert.equal(blocks[10].content, 'A quoted line\nstill quoted');
assert.match(blocks[11].content, /const n = 1/);
assert.match(blocks[11].content, /# not a heading/);
assert.equal(blocks[11].props.lang, 'js');
assert.equal(blocks[13].props.header, true);
assert.equal(blocks[13].props.rows.length, 3);
assert.equal(blocks[13].props.rows[0].length, 2);
assert.equal(blocks[13].props.rows[1][0], '**Launch**');

const numbers = blocks.map((block, index) => (block.type === 'numbered' ? listNumber(blocks, index) : 0));
assert.deepEqual(numbers.filter(Boolean), [1, 2]);

const nested = parseMarkdown('1. Parent\n   1. Child\n   2. Child two\n2. Next');
assert.deepEqual(nested.map((block, index) => listNumber(nested, index)), [1, 1, 2, 2]);

assert.equal(shouldSplitMarkdown(sample), true);
assert.equal(shouldSplitMarkdown('**only bold**'), false);
assert.equal(shouldSplitMarkdown('# Just a heading'), true);
assert.equal(shouldSplitMarkdown('hello'), false);

const lead = inlineTokens('**October 20.** and *I\'m glad I did it*, or *I wish I\'d started sooner.*');
assert.equal(lead[0].type, 'bold');
assert.equal(textOf(lead[0].children), 'October 20.');
assert.equal(lead.some((token) => token.type === 'italic' && textOf(token.children) === "I'm glad I did it"), true);
assert.equal(lead.some((token) => token.type === 'italic' && textOf(token.children) === "I wish I'd started sooner."), true);

const linked = inlineTokens('See [the notes](https://example.com/plan) and `code`.');
assert.equal(linked.find((token) => token.type === 'link').url, 'https://example.com/plan');
assert.equal(linked.find((token) => token.type === 'code').text, 'code');
assert.equal(inlineTokens('[x](javascript:alert(1))').some((token) => token.type === 'link'), false);
assert.equal(textOf(inlineTokens('snake_case stays')), 'snake_case stays');

assert.deepEqual(words(stripMarkers(sample)), blockWords(blocks));

const originalPath = '/cursor/stores/self/tally/the-plan-original.md';
if (existsSync(originalPath)) {
  const original = readFileSync(originalPath, 'utf8');
  const parsed = parseMarkdown(original);
  assert.equal(parsed[0].type, 'h1');
  assert.match(parsed[0].content, /246 to 200/);
  assert.equal(parsed.filter((block) => block.type === 'table').length, 2);
  assert.equal(parsed.filter((block) => block.type === 'divider').length, 9);
  assert.equal(parsed.filter((block) => block.type === 'numbered').length, 5);
  const road = parsed.find((block) => block.type === 'table');
  assert.equal(road.props.rows[0].join('|'), 'Phase|Dates|Goal|Mindset');
  assert.equal(road.props.rows.length, 6);
  assert.deepEqual(words(stripMarkers(original)), blockWords(parsed));
  const rendered = parsed.map((block) => {
    const cells = (block.props?.rows || []).flat().map((cell) => textOf(inlineTokens(cell))).join(' ');
    return `${textOf(inlineTokens(block.content))} ${cells}`;
  }).join('\n');
  for (const word of words(stripMarkers(original))) assert.ok(rendered.toLowerCase().includes(word), word);
}

console.log('markdown ok');
