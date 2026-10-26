/**
 * Pick the next D-pad target from element rectangles.
 * `items` are { id, left, top, right, bottom, disabled }.
 * Returns the chosen id, or the current id when nothing lies that way.
 */

function center(item) {
  return {
    x: (item.left + item.right) / 2,
    y: (item.top + item.bottom) / 2,
  };
}

function isToward(from, to, dir) {
  if (dir === 'left') return to.x < from.x - 4;
  if (dir === 'right') return to.x > from.x + 4;
  if (dir === 'up') return to.y < from.y - 4;
  if (dir === 'down') return to.y > from.y + 4;
  return false;
}

export function nextTvTarget(items, currentId, dir) {
  const list = (items || []).filter((item) => item && !item.disabled);
  if (list.length === 0) return currentId;
  const current = list.find((item) => item.id === currentId) || list[0];
  const from = center(current);
  let best = null;
  let bestScore = Infinity;
  for (const item of list) {
    if (item.id === current.id) continue;
    const to = center(item);
    if (!isToward(from, to, dir)) continue;
    const primary = dir === 'left' || dir === 'right' ? Math.abs(to.x - from.x) : Math.abs(to.y - from.y);
    const secondary = dir === 'left' || dir === 'right' ? Math.abs(to.y - from.y) : Math.abs(to.x - from.x);
    const score = primary + secondary * 1.6;
    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return best ? best.id : current.id;
}
