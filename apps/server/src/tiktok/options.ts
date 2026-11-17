import type { TikTokLiveConstructorConnectionOptions } from 'tiktok-live-connector';
/** Checked against installed connector 2.5.0. No account authentication or initial/history batch. */
export const connectorOptions: TikTokLiveConstructorConnectionOptions = {
  processInitialData: false, fetchRoomInfoOnConnect: true, enableExtendedGiftInfo: false,
  authenticateWs: false, useMobile: false,
  // Upstream types require cookieJar, although runtime creates it before merging these overrides.
  webClientOptions: { timeout: { request: 15000 }, retry: { limit: 0 } } as TikTokLiveConstructorConnectionOptions['webClientOptions'],
  wsClientOptions: { handshakeTimeout: 15000 }
};
