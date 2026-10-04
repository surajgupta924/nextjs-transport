type Row = Record<string, unknown>;

const rowsByKey = new Map<string, Row[]>();
const requestsByKey = new Map<string, Promise<Row[]>>();

export function getCachedRows(key: string) {
  return rowsByKey.get(key);
}

export function setCachedRows(key: string, rows: Row[]) {
  rowsByKey.set(key, rows);
  return rows;
}

export function loadRows(key: string, url: string, refresh = false) {
  if (!refresh) {
    const cached = rowsByKey.get(key);
    if (cached) return Promise.resolve(cached);
  }
  const existingRequest = requestsByKey.get(key);
  if (existingRequest) return existingRequest;
  const request = fetch(url, { cache: "no-store" }).then(async (response) => {
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Could not load records.");
    return setCachedRows(key, body.data ?? []);
  }).finally(() => requestsByKey.delete(key));
  requestsByKey.set(key, request);
  return request;
}
