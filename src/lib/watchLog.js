import { isIsoDay } from './isoDay.js';

/** Whole-number stars from 1 to 5, or null when the value is missing or invalid. */
export function parseRating(value) {
  if (value === '' || value === null || value === undefined) return null;
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return rating;
}

export function normalizeWatch(fields) {
  const title = String(fields?.title || '').trim();
  if (!title) return { error: 'Add a title.' };
  if (title.length > 200) return { error: 'Title is too long.' };

  const link = String(fields?.link || '').trim();
  if (link && !/^https?:\/\//i.test(link)) {
    return { error: 'Link should start with http:// or https://.' };
  }
  if (link.length > 2000) return { error: 'Link is too long.' };

  const watchedOn = fields?.watchedOn || null;
  if (watchedOn && !isIsoDay(watchedOn)) {
    return { error: 'Date watched must be YYYY-MM-DD.' };
  }

  const hasRating = fields?.rating !== '' && fields?.rating !== null && fields?.rating !== undefined;
  const rating = hasRating ? parseRating(fields.rating) : null;
  if (hasRating && rating == null) {
    return { error: 'Rating is a whole number from 1 to 5.' };
  }

  const notes = String(fields?.notes || '').trim();
  if (notes.length > 4000) return { error: 'Notes are too long.' };

  return {
    value: {
      title,
      link,
      watchedOn: watchedOn || null,
      rating,
      notes,
    },
  };
}

/** Newest watched date first, then newest edit. */
export function recentWatches(entries, limit = 5) {
  return [...(entries || [])]
    .filter((entry) => entry && !entry.deleted)
    .sort((a, b) => {
      const byDay = (b.watchedOn || '').localeCompare(a.watchedOn || '');
      if (byDay) return byDay;
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    })
    .slice(0, Math.max(0, limit));
}
