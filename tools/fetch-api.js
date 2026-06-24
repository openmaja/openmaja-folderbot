/**
 * fetch-api.js — HTTP fetch with optional origin allowlist
 *
 * Allowlist config is read from FolderBot/tools/fetch-allowlist.json at runtime.
 * If the file is missing or allowlist.enabled is false, all URLs are permitted.
 * If enabled is true, only origins in allowed_origins are permitted.
 *
 * params:
 *   url         {string}   Full URL to fetch
 *   method      {string}   HTTP method, default "GET"
 *   headers     {object}   Request headers (optional)
 *   body        {string}   Request body for POST/PUT (optional)
 *   timeout_ms  {number}   Timeout in milliseconds, default 15000
 *
 * returns:
 *   { status: number, body: string, ok: boolean }
 */
async function run(params, fs) {
  const { url, method = 'GET', headers = {}, body, timeout_ms = 15000 } = params;
  if (!url) throw new Error('fetch-api: missing required param: url');

  // Load allowlist config — missing file means no restriction
  let allowlistEnabled = false;
  let allowedOrigins = [];
  try {
    const raw = await fs.readRoot('tools/fetch-allowlist.json');
    const config = JSON.parse(raw);
    allowlistEnabled = config.enabled === true;
    allowedOrigins = config.allowed_origins ?? [];
  } catch {
    // No allowlist file — all URLs permitted
  }

  if (allowlistEnabled) {
    const origin = new URL(url).origin;
    const permitted = allowedOrigins.some(
      a => origin === a || origin.endsWith('.' + a.replace(/^https?:\/\//, ''))
    );
    if (!permitted) {
      throw new Error(
        `fetch-api: origin ${origin} is not in the allowlist. ` +
        `Add it to tools/fetch-allowlist.json → allowed_origins, ` +
        `or set "enabled": false to allow all URLs.`
      );
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout_ms);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? body : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    return { status: response.status, body: text, ok: response.ok };
  } finally {
    clearTimeout(timer);
  }
}
