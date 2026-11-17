import { Container, Graphics, Text } from 'pixi.js';
import type { SceneAction, SceneState } from '@vuonsen/shared';
import { placeBubble, type Rect } from './live-motion';

export class ChatBubbles {
  readonly root = new Container();
  private session = '';
  private items = new Map<string, { root: Container; text: string; at: number; expiresAt: number; height: number }>();
  clear() { for (const item of this.items.values()) item.root.destroy({ children: true }); this.items.clear(); }
  update(state: SceneState, actions: SceneAction[]) {
    if (this.session !== state.sessionId || !state.settings.showBubbles) this.clear();
    this.session = state.sessionId;
    if (!state.settings.showBubbles) return;
    for (const [key, item] of this.items) if (item.expiresAt <= state.serverTime || !state.actors.some(a => a.key === key && a.status !== 'exit')) {
      item.root.destroy({ children: true }); this.items.delete(key);
    }
    for (const action of actions) {
      if (action.type !== 'CHAT_BUBBLE' || !action.bubble || action.bubble.expiresAt <= state.serverTime || !state.actors.some(a => a.key === action.actorId)) continue;
      const previous = this.items.get(action.actorId);
      if (previous && action.at - previous.at < 2000) continue;
      if (!previous && this.items.size >= 4) continue;
      previous?.root.destroy({ children: true });
      const root = new Container();
      const text = new Text({ text: action.bubble.text, style: { fontFamily: 'Segoe UI', fontSize: 24, fill: 0xfff2d9, wordWrap: true, breakWords: true, wordWrapWidth: 252, lineHeight: 30 } });
      text.position.set(14, 10);
      const height = text.height + 20;
      root.addChild(new Graphics().roundRect(0, 0, 280, height, 12).fill({ color: 0x21140d, alpha: .94 }).stroke({ color: 0xd1ad6b, width: 1 })
        .poly([132, height, 140, height + 9, 148, height]).fill(0xd1ad6b), text);
      root.visible = false; this.root.addChild(root);
      this.items.set(action.actorId, { root, text: action.bubble.text, at: action.at, expiresAt: action.bubble.expiresAt, height });
    }
  }
  tick(now: number, anchors: Map<string, { x: number; y: number }>, obstacles: Rect[]) {
    const occupied = [...obstacles];
    for (const [key, item] of this.items) {
      const anchor = anchors.get(key);
      if (now >= item.expiresAt || !anchor) { item.root.destroy({ children: true }); this.items.delete(key); continue; }
      const box = placeBubble(anchor.x, anchor.y, 280, item.height + 10, occupied);
      // A crowded comment is dropped, never queued for a later misleading replay.
      if (!box) { item.root.destroy({ children: true }); this.items.delete(key); continue; }
      item.root.visible = true; item.root.position.set(box.x, box.y);
      item.root.alpha = Math.max(0, Math.min(1, (now - item.at) / 160, (item.expiresAt - now) / 250));
      occupied.push(box);
    }
  }
  debug() { return [...this.items].map(([actorId, item]) => ({ actorId, text: item.text, expiresAt: item.expiresAt, x: item.root.x, y: item.root.y, width: 280, height: item.height + 10 })); }
}
