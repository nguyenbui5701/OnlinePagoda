import { Container, Graphics, Text } from 'pixi.js';
import { cleanText, effectInstructions, type SceneState } from '@vuonsen/shared';
import {avatarCircle} from './avatar-cache';
import {compactPanelY} from '../effect-space';

export function compactPanels() {
  const root = new Container();
  function panel(x: number) {
    const c = new Container(); c.position.set(x, compactPanelY);
    c.addChild(new Graphics().roundRect(0, 0, 230, 350, 12).fill({ color: 0x21120a, alpha: .86 }).stroke({ color: 0xd0ac67, width: 1 })); root.addChild(c); return c;
  }
  function label(c: Container, value: string, y: number, size = 22, gold = false) {
    const t = new Text({ text: value, style: { fontFamily: 'Segoe UI', fontSize: size, fill: gold ? 0xe7c47f : 0xffefd2, align: 'center', wordWrap: true, breakWords: true, wordWrapWidth: 210, lineHeight: size * 1.3 } });
    t.anchor.set(.5, 0); t.position.set(115, y); c.addChild(t); return t;
  }
  const left = panel(24), right = panel(826);
  label(left, 'GÕ HIỆU ỨNG', 15, 22, true);
  const rows = [0, 1].map(i => ({ title: label(left, '', 58 + i * 85, 24), action: label(left, '', 91 + i * 85) }));
  left.addChild(new Graphics().moveTo(14, 233).lineTo(216, 233).stroke({ color: 0xd0ac67, width: 1, alpha: .4 }));
  const guide = label(left, '', 246);
  label(right, 'LỜI CẢM ƠN', 15, 22, true);
  const ranking = [0, 1, 2].map(i => label(right, '', 57 + i * 38));
  const empty = label(right, 'Chờ lời sẻ chia', 86);
  const total = label(right, '', 181, 22, true);
  const recentTitle = label(right, 'VỪA NHẬN', 223, 22, true);
  const recent = label(right, '', 256);
  let portrait:Container|undefined,portraitKey='';
  let state: SceneState | undefined, page = -1;
  return {
    root,
    update(s: SceneState) {
      state = s; root.visible = s.settings.compactGiftPanels;
      left.visible = s.settings.showGiftPanel; right.visible = s.settings.showThanksPanel;
      guide.visible = s.settings.showGuide;
      guide.text = s.settings.autoJoinChat ? '“Vào chùa” → ngồi\nXin quẻ · Cầu an\n'+(s.settings.templeFloorPreview?'“Thắp nhang” → lễ':'Miễn phí qua chat') : 'Miễn phí qua chat\nXin quẻ · Cầu an';
      const leaders = s.leaderboard || []; empty.visible = !leaders.length;
      ranking.forEach((t, i) => { const r = leaders[i]; t.text = r ? `${i + 1}. ${cleanText(r.displayName, 10)} · ${r.score}` : ''; });
      total.text = `${s.metrics.giftUnits} quà`;total.visible=Boolean(s.metrics.giftUnits);
      const emptyHeight=leaders.length?350:150;
      if(right.label!==String(emptyHeight)){
        (right.children[0] as Graphics).clear().roundRect(0,0,230,emptyHeight,12).fill({color:0x21120a,alpha:.86}).stroke({color:0xd0ac67,width:1});right.label=String(emptyHeight);
      }
      // Never shrink names to tiny text: truncate by grapheme budget instead.
      const gift = s.recentGifts?.[0]; recent.visible = recentTitle.visible = s.settings.showRegister && Boolean(gift);
      const nextKey=gift?`${s.sessionId}:${gift.eventKey}:${gift.avatarUrl||''}`:'';
      if(nextKey!==portraitKey){portrait?.destroy({children:true});portrait=undefined;portraitKey=nextKey;
        if(gift){portrait=avatarCircle(gift.displayName,gift.avatarUrl,48);portrait.position.set(39,281);right.addChild(portrait);}}
      if(portrait)portrait.visible=recent.visible;
      recent.position.set(146,256);recent.style.wordWrapWidth=142;recent.style.fontSize=18;
      recent.text = gift ? `${cleanText(gift.displayName, 18)}\n×${gift.units}` : '';
    },
    tick(now: number) {
      const next = Math.floor(now / 6000) % Math.ceil(effectInstructions.length / 2);
      if (page === next) return; page = next;
      rows.forEach((row, i) => { const item = effectInstructions[page * 2 + i]; row.title.text = item ? `“${item.command}”` : ''; row.action.text = item?.description || ''; });
    },
    debug() { return { visible: root.visible, page, width: 230, height: 350, giftUnits: state?.metrics.giftUnits }; }
  };
}
