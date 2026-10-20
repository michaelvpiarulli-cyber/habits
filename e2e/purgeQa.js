const URL = 'https://amrqzdnsbgoqkckcytjq.supabase.co';
const KEY = 'sb_publishable__NKtri3G-26DlHkv-ZmQ7g_BP0rX698';
const USER = 'a1111111-1111-4111-8111-111111111111';

function headers() {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

function isQaPage(title) {
  const name = title || '';
  return name === 'Untitled' || name.startsWith('QA ');
}

async function readRows(table, extra = '') {
  const response = await fetch(
    `${URL}/rest/v1/${table}?user_id=eq.${USER}${extra}&select=id,title`,
    { headers: headers() },
  );
  if (!response.ok) throw new Error(`${table} list ${response.status} ${await response.text()}`);
  return response.json();
}

async function removeRows(table, ids, column = 'id') {
  if (!ids.length) return;
  const response = await fetch(
    `${URL}/rest/v1/${table}?${column}=in.(${ids.join(',')})`,
    { method: 'DELETE', headers: headers() },
  );
  if (!response.ok) throw new Error(`${table} delete ${response.status} ${await response.text()}`);
}

async function markDeleted(table, column, ids, now) {
  if (!ids.length) return;
  const response = await fetch(
    `${URL}/rest/v1/${table}?${column}=in.(${ids.join(',')})`,
    {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ deleted: true, updated_at: now }),
    },
  );
  if (!response.ok) throw new Error(`${table} patch ${response.status} ${await response.text()}`);
}

/** Soft-delete pages, blocks, tasks, and watches created by the QA prefix. */
export async function purgeQaData() {
  const now = new Date().toISOString();
  const pages = await readRows('pages', '&system_key=is.null');
  const pageIds = pages.filter((page) => isQaPage(page.title)).map((page) => page.id);
  await markDeleted('pages', 'id', pageIds, now);
  await markDeleted('blocks', 'page_id', pageIds, now);
  await removeRows('pages', pageIds.filter((id) => {
    const page = pages.find((row) => row.id === id);
    return (page?.title || '').startsWith('QA ');
  }));
  await removeRows('blocks', pageIds.filter((id) => {
    const page = pages.find((row) => row.id === id);
    return (page?.title || '').startsWith('QA ');
  }), 'page_id');

  for (const table of ['tasks', 'watch_entries']) {
    const rows = await readRows(table);
    const ids = rows.filter((row) => (row.title || '').startsWith('QA ')).map((row) => row.id);
    await markDeleted(table, 'id', ids, now);
  }
}
