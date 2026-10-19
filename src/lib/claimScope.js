/**
 * Fold one localStorage scope into an account a single time.
 * Empty scopes are flagged too, so a later write under the old key is not
 * pulled in after the account has its own copy.
 */
export function claimScopeOnce(storage, { flagKey, load, hasData }) {
  if (!storage || storage.getItem(flagKey)) return null;
  const records = load();
  const filled = Boolean(hasData(records));
  storage.setItem(flagKey, filled ? 'claimed' : 'empty');
  return filled ? records : null;
}
