export type FaultKind = 'offline' | 'network' | 'rate-limit' | 'signing' | 'unknown';
export interface LiveFault { kind: FaultKind; code: string; message: string; retryAfterMs?: number }
const messages = {
  offline: 'Kênh chưa LIVE hoặc phiên LIVE đã kết thúc. Bật LIVE công khai rồi bấm Thử lại.',
  network: 'Không kết nối được mạng hoặc WebSocket. Ứng dụng sẽ thử lại có giới hạn; cảnh được giữ nguyên.',
  'rate-limit': 'TikTok hoặc dịch vụ ký đang giới hạn yêu cầu. Chờ hết thời gian trước khi thử lại.',
  signing: 'Dịch vụ ký từ chối hoặc yêu cầu xác thực/quyền truy cập. Đã dừng tự thử lại; không nhập cookie, mật khẩu hoặc token TikTok.',
  unknown: 'Không xác minh được kết nối TikTok. Kiểm tra tên kênh và thử lại sau; DEMO vẫn hoạt động.'
};
const fault = (kind: FaultKind, retryAfterMs?: number): LiveFault => ({ kind, code: kind.toUpperCase().replace('-', '_'), message: messages[kind], ...(retryAfterMs ? { retryAfterMs } : {}) });

/** Output is an allowlisted explanation, never the raw exception/message/headers. */
export function classifyLiveError(input: unknown, now = Date.now(), depth = 0): LiveFault {
  if (depth > 5 || !input || typeof input !== 'object') return fault('unknown');
  const e = input as Record<string, any>;
  if (e.exception) return classifyLiveError(e.exception, now, depth + 1);
  if (e.safeFault && ['offline', 'network', 'rate-limit', 'signing', 'unknown'].includes(e.safeFault.kind)) {
    const delay = typeof e.safeFault.retryAfterMs === 'number' && Number.isFinite(e.safeFault.retryAfterMs) ? Math.max(0, e.safeFault.retryAfterMs) : undefined;
    return fault(e.safeFault.kind, delay);
  }
  const name = `${e.name || ''} ${e.constructor?.name || ''}`;
  const status = e.statusCode ?? e.status ?? e.response?.statusCode ?? e.response?.status;
  if (/SignatureRateLimitError/.test(name) || status === 429 || e.reason === 'Rate Limited') {
    // Connector 2.5.0 SignatureRateLimitError.retryAfter is already in milliseconds.
    let delay = typeof e.retryAfter === 'number' && Number.isFinite(e.retryAfter) ? e.retryAfter : 0;
    const header = e.response?.headers?.['retry-after'];
    if (typeof header === 'string' || typeof header === 'number') {
      const seconds = Number(header); delay = Math.max(delay, Number.isFinite(seconds) ? seconds * 1000 : (Date.parse(String(header)) || now) - now);
    }
    if (typeof e.resetTime === 'number' && Number.isFinite(e.resetTime)) delay = Math.max(delay, e.resetTime - now);
    return fault('rate-limit', Math.max(60000, delay));
  }
  if (/UserOfflineError|StreamEnded/.test(name)) return fault('offline');
  if (status === 401 || status === 403 || /SignAPIError|SignatureMissingTokensError|PremiumFeatureError|AuthenticatedWebSocketConnectionError/.test(name)) return fault('signing');
  const children = e.config?.requestErrs ?? (e.cause ? [e.cause] : e.config?.requestErr ? [e.config.requestErr] : []);
  if (Array.isArray(children) && children.length) {
    const faults = children.slice(0, 8).map(child => classifyLiveError(child, now, depth + 1));
    const limited = faults.filter(f => f.kind === 'rate-limit');
    if (limited.length) return fault('rate-limit', Math.max(...limited.map(f => f.retryAfterMs || 60000)));
    const signing = faults.find(f => f.kind === 'signing'); if (signing) return signing;
    if (faults.every(f => f.kind === 'offline')) return fault('offline');
    if (faults.every(f => f.kind === 'network' || f.kind === 'offline') && faults.some(f => f.kind === 'network')) return fault('network');
    // Conflicting lookup failures do not prove the channel is offline.
  }
  if (/ConnectTimeoutError|TimeoutError|AbortError|TransportClosedError/.test(name) || /^(ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|EHOSTUNREACH|UND_ERR_CONNECT_TIMEOUT)$/.test(String(e.code)) || (typeof status === 'number' && status >= 500)) return fault('network');
  return fault('unknown');
}
