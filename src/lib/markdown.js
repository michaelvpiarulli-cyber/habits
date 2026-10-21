/**
 * Turn pasted Markdown into notebook blocks, and inline marks into tokens.
 * The markers stay in the stored text so a block can still be edited.
 */

function normalize(source) {
  return String(source || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function isFence(line) {
  return /^```/.test(line.trim());
}

function isRule(line) {
  return /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim());
}

function isTableSep(line) {
  const text = String(line || '').trim();
  if (!text.includes('-') || !text.includes('|')) return false;
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(text);
}

function isTableRow(line) {
  const text = String(line || '').trim();
  if (!text.includes('|')) return false;
  return (text.match(/\|/g) || []).length >= 2;
}

function splitRow(line) {
  let text = String(line || '').trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|')) text = text.slice(0, -1);
  return text.split('|').map((cell) => cell.trim());
}

function headingOf(line) {
  const match = /^(#{1,6})\s+(\S.*)$/.exec(line);
  if (!match) return null;
  const level = Math.min(3, match[1].length);
  return { type: `h${level}`, content: match[2].trim() };
}

function listOf(line) {
  const match = /^(\s*)(?:([-*+])|(\d+)[.)])\s+(?:\[([ xX])\]\s*)?(\S.*)?$/.exec(line);
  if (!match) return null;
  const indent = Math.min(6, Math.floor(match[1].replace(/\t/g, '  ').length / 2));
  const box = match[4];
  const content = match[5] || '';
  const type = box != null ? 'todo' : match[3] ? 'numbered' : 'bullet';
  return {
    type,
    content,
    checked: box != null && /x/i.test(box),
    props: indent ? { indent } : {},
  };
}

function isStructural(line) {
  return isFence(line) || isRule(line) || isTableRow(line) || headingOf(line) || listOf(line) || /^>\s?/.test(line);
}

function block(type, content, extra = {}) {
  return {
    type,
    content: content || '',
    checked: !!extra.checked,
    props: extra.props || {},
  };
}

/** Split a Markdown document into notebook blocks. Blank lines are spacing, not blocks. */
export function parseMarkdown(source) {
  const lines = normalize(source).split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (isFence(line)) {
      const lang = line.trim().slice(3).trim();
      const body = [];
      i += 1;
      while (i < lines.length && !isFence(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(block('code', body.join('\n'), { props: lang ? { lang } : {} }));
      continue;
    }
    if (isTableRow(line) && isTableSep(lines[i + 1])) {
      const rows = [splitRow(line)];
      i += 2;
      while (i < lines.length && isTableRow(lines[i]) && !isTableSep(lines[i])) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      const width = Math.max(...rows.map((row) => row.length));
      const padded = rows.map((row) => {
        const next = row.slice(0, width);
        while (next.length < width) next.push('');
        return next;
      });
      blocks.push(block('table', '', { props: { rows: padded, header: true } }));
      continue;
    }
    if (isRule(line)) {
      blocks.push(block('divider', ''));
      i += 1;
      continue;
    }
    const heading = headingOf(line);
    if (heading) {
      blocks.push(block(heading.type, heading.content));
      i += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const parts = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        parts.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(block('quote', parts.join('\n')));
      continue;
    }
    const item = listOf(line);
    if (item) {
      blocks.push(block(item.type, item.content, item));
      i += 1;
      continue;
    }
    const para = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() && !isStructural(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push(block('text', para.join(' ')));
  }
  return blocks;
}

/** True when a paste should become several blocks instead of one paragraph. */
/** Number for a numbered block. Nested items do not consume the parent's count. */
export function listNumber(blocks, index) {
  const block = blocks[index];
  if (!block || block.type !== 'numbered') return 0;
  const indent = Number(block.props?.indent) || 0;
  let count = 1;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const prev = blocks[cursor];
    const prevIndent = Number(prev.props?.indent) || 0;
    if (prevIndent > indent) continue;
    if (prev.type === 'numbered' && prevIndent === indent) {
      count += 1;
      continue;
    }
    break;
  }
  return count;
}

export function shouldSplitMarkdown(source) {
  const text = normalize(source);
  if (!text.trim()) return false;
  const blocks = parseMarkdown(text);
  if (blocks.length > 1) return true;
  return blocks.length === 1 && blocks[0].type !== 'text';
}

function pushText(tokens, text) {
  if (!text) return;
  const last = tokens[tokens.length - 1];
  if (last && last.type === 'text') last.text += text;
  else tokens.push({ type: 'text', text });
}

/**
 * Inline marks in reading order. Bold, italic, code, and links.
 * Unknown markers stay as text so nothing is dropped.
 */
export function inlineTokens(source) {
  const s = String(source || '');
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    if (s.startsWith('**', i) || s.startsWith('__', i)) {
      const mark = s.slice(i, i + 2);
      const end = s.indexOf(mark, i + 2);
      if (end > i + 2) {
        tokens.push({ type: 'bold', children: inlineTokens(s.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    if (s[i] === '`' ) {
      const end = s.indexOf('`', i + 1);
      if (end > i + 1) {
        tokens.push({ type: 'code', text: s.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    const link = /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/.exec(s.slice(i));
    if (link) {
      tokens.push({ type: 'link', text: link[1], url: link[2] });
      i += link[0].length;
      continue;
    }
    if ((s[i] === '*' || s[i] === '_') && s[i + 1] !== s[i] && s[i + 1] !== ' ' && s[i + 1] !== '\n' && !(s[i] === '_' && i > 0 && /[\w]/.test(s[i - 1]))) {
      const mark = s[i];
      let end = s.indexOf(mark, i + 1);
      while (end > i && (s[end - 1] === ' ' || s[end + 1] === mark)) end = s.indexOf(mark, end + 1);
      if (end > i + 1) {
        tokens.push({ type: 'italic', children: inlineTokens(s.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    let j = i + 1;
    while (j < s.length && s[j] !== '*' && s[j] !== '_' && s[j] !== '`' && s[j] !== '[') j += 1;
    pushText(tokens, s.slice(i, j));
    i = j;
  }
  return tokens;
}
