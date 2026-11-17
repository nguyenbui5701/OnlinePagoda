import { io } from 'socket.io-client';
import { applyDelta, type SceneAction, type SceneDelta, type SceneState } from './index';
export function connectScene(role: 'overlay' | 'dashboard', onState: (state: SceneState, actions: SceneAction[]) => void) {
  const surface=role==='dashboard'?'dashboard':new URLSearchParams(location.search).has('capture')?'capture':window.parent!==window?'preview':'browser';
  const socket = io({ auth: { role,surface }, reconnectionDelay: 2000, reconnectionDelayMax: 30000, randomizationFactor: 0.5 });
  let state: SceneState | undefined;
  socket.on('snapshot', (value: SceneState) => { state = value; onState(state, []); });
  socket.on('delta', (delta: SceneDelta) => {
    if (!state || delta.sessionId !== state.sessionId || delta.revision !== state.revision + 1) { socket.emit('resync'); return; }
    state = applyDelta(state, delta); onState(state, delta.actions);
  });
  return socket;
}
