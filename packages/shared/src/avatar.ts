/** Only public TikTok image CDNs; no arbitrary URLs, credentials, local files or server fetch. */
export function safeAvatarUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048) return;
  try {
    const url = new URL(value);
    const domains = ['tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokcdn-eu.com', 'byteoversea.com', 'ibytedtos.com', 'muscdn.com'];
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !domains.some(d => url.hostname === d || url.hostname.endsWith('.' + d))) return;
    url.hash = ''; return url.href;
  } catch { return; }
}
