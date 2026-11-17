import {cardPresentation,interactionCooldownMs} from '@vuonsen/shared';
import {groundHome,ceremonyJourney,homeRoute,prayerJourney,type Seat} from '@vuonsen/shared';
import {GroundTraffic} from './ground-traffic';
import {CameraDirector} from './camera-director';
import { CommentEffects } from './comment-effects';
import { BlessingTree } from './blessing-tree';
import { SceneEnvironment } from './environment';
import { parseCommunityCommand } from './community-parser';
import { bubbleText } from './interaction-text';
import { randomUUID } from 'node:crypto';
import { GiftScoreboard } from './gift-scoreboard';
import {GiftShowQueue} from './gift-show';
import { rawEventSchema, type CameraView, type CameraState } from '@vuonsen/shared';
import { parseFortuneCommand } from './fortune-parser';
import { getFortuneCatalog } from './fortune-catalog';
import { FortuneQueue } from './fortune-queue';
import { LanternQueue,parseLanternCommand } from './lantern-queue';
import { actorHome, isStanding, cleanText, defaultSettings, initialLiveState, normalizeEvent, seats, settingsSchema, settingsPatchSchema, type Actor, type DomainEvent, type LogEntry, type Metrics, type SceneAction, type SceneState, type Settings, type Toast, type SourceMode, type OfferingRitual } from '@vuonsen/shared';

export class SceneEngine {
  readonly cameraDirector=new CameraDirector();
  readonly traffic=new GroundTraffic();
  private get ordered(){return this.settings.templeFloorPreview&&this.settings.theme==='golden'&&this.settings.sceneSpace==='hall';}
  private freeIncense:{actorId:string;enqueuedAt:number;effect:'rose'}[]=[];
  private incenseCounts={completed:0,expired:0,cooldown:0,busy:0};
  get camera(){return this.cameraDirector.state;}
  selectCamera(view:CameraView){this.cameraDirector.manual(view,this.now());}

  sessionId = randomUUID(); revision = 0;
  readonly commentEffects=new CommentEffects();
  readonly tree=new BlessingTree();
  readonly environment=new SceneEnvironment();
  private environmentBusy(){return Boolean(this.activeRitual||this.ritualQueue.length||this.giftShow.snapshot().active.length||this.tree.snapshot().phase==='bloom');}
  weather(preset:'leaves'|'petals'|'stop'){this.environment.request(preset,this.now(),this.environmentBusy());}
  private treeEligible=new WeakSet<DomainEvent>();
  readonly gifts = new GiftScoreboard();
  readonly giftShow=new GiftShowQueue();
  readonly fortunes = new FortuneQueue(getFortuneCatalog());
  readonly lanterns = new LanternQueue();
  private lastDisplay:'fortune'|'lantern'='lantern';
  settings: Settings;
  actors = new Map<string, Actor>(); waiting = new Map<string, DomainEvent>();
  participants = new Set<string>(); pending: DomainEvent[] = [];
  seen = new Map<string, number>(); cooldowns = new Map<string, number>();
  recent: string[] = []; toasts: Toast[] = []; logs: LogEntry[] = []; actions: SceneAction[] = [];
  provider: SceneState['provider'] = 'connected';
  mode: SourceMode = 'demo'; connection = initialLiveState();
  metrics: Metrics = { received: 0, dropped: 0, reasons: {}, perSecond: 0, pending: 0, overlayCount: 0, fps: 0, quality: 'Chờ overlay', newActors: 0, giftUnits: 0, giftTransactions: 0, likeUnits: 0 };
  private deferred = new Map<string, { keyword: 'lotus' | 'pray'; expiresAt: number }>();
  /** Ritual queue is capped and separate from gift scoring: all confirmed gifts still count. */
  private ritualQueue: { actorId: string; enqueuedAt: number; effect: NonNullable<OfferingRitual['effect']> }[] = [];
  private activeRitual?: OfferingRitual;
  private welcomed = new Set<string>();
  private prayerCounts={completed:0,expired:0,cooldown:0,busy:0};
  private seatedCount(){return [...this.actors.values()].filter(a=>!isStanding(a)).length;}
  private showStanding(actor:Actor){
    if(!isStanding(actor)||actor.standingSlot!==undefined)return;
    const visible=[...this.actors.values()].filter(a=>isStanding(a)&&a.standingSlot!==undefined);
    const used=new Set(visible.map(a=>a.standingSlot));
    let slot=Array.from({length:20},(_,i)=>i).find(i=>!used.has(i));
    if(slot===undefined){
      const victim=visible.filter(a=>a.welcome?.startedAt===undefined&&a.key!==this.activeRitual?.actorId&&a.status!=='to-standing').sort((a,b)=>a.lastActiveAt-b.lastActiveAt)[0];
      if(!victim)return;slot=victim.standingSlot;delete victim.standingSlot;
    }
    actor.standingSlot=slot;
  }
  private leaveSeat(actor:Actor,now:number){
    if(isStanding(actor)||actor.travel)return;
    actor.transitionFrom=actorHome(actor);actor.seatId=`standing-${actor.key}`;
    actor.standingSince=now;actor.status='to-standing';actor.statusAt=now;
    this.waiting.delete(actor.key);this.showStanding(actor);
    if(this.ordered)actor.travel={from:groundHome(actor.transitionFrom!),to:groundHome(actorHome(actor)),kind:'standing'};
  }
  private requestBow(actor:Actor,now:number,first=false){
    if(actor.welcome||actor.travel)return;
    const key=`bow:${actor.key}`;
    if(!first&&(this.cooldowns.get(key)??0)>now){this.prayerCounts.cooldown++;return;}
    if([...this.actors.values()].filter(a=>a.welcome?.startedAt===undefined&&a.welcome).length>=100){this.prayerCounts.busy++;return;}
    this.cooldowns.set(key,now+interactionCooldownMs);
    actor.welcome={queuedAt:now,durationMs:6000,lane:0,reason:first?'welcome':'bow',...(!first?{origin:actorHome(actor)}:{})};
    if(this.ordered)actor.welcome.origin=first?{id:'entry',x:500,y:1960,scale:.70,side:'left'}:actorHome(actor);
  }
  private finishWelcomes(now:number){
    for(const actor of this.actors.values()){
      const w=actor.welcome;if(!w)continue;
      if(w.startedAt!==undefined&&now-w.startedAt>=w.durationMs){delete actor.welcome;this.prayerCounts.completed++;if(w.journey){actor.status=isStanding(actor)?'standing':'idle';actor.statusAt=now;this.traffic.release(actor.key);}}
      else if(w.startedAt===undefined&&now-w.queuedAt>=60000){delete actor.welcome;this.prayerCounts.expired++;if(this.ordered&&w.reason==='welcome'){actor.travel={from:groundHome(w.origin!),to:groundHome(actorHome(actor)),kind:isStanding(actor)?'standing':'seat'};actor.status='walk';}}
    }
  }
  private startWelcomes(now:number){
    const occupied=new Set([...this.actors.values()].filter(a=>a.welcome?.startedAt!==undefined).map(a=>(a.welcome!.row??0)*6+a.welcome!.lane));
    const reserved=Boolean(this.activeRitual||this.ritualQueue.length||this.freeIncense.length);
    const donors=new Set(this.ritualQueue.map(r=>r.actorId));
    const pending=[...this.actors.values()].filter(a=>a.welcome&&a.welcome.startedAt===undefined&&!a.travel&&a.status!=='exit'&&a.status!=='to-standing'&&a.key!==this.activeRitual?.actorId)
      .sort((a,b)=>Number(donors.has(b.key))-Number(donors.has(a.key))||a.welcome!.queuedAt-b.welcome!.queuedAt);
    for(const actor of pending){
      if(isStanding(actor)){this.showStanding(actor);if(actor.standingSlot===undefined)continue;}
      const available=Array.from({length:18},(_,i)=>i).filter(i=>!occupied.has(i)&&(!reserved||i>=6));
      const slot=this.ordered?available[Math.floor(Math.random()*available.length)]:available[0];if(slot===undefined)break;
      const row=Math.floor(slot/6),lane=slot%6;
      const journey=this.ordered?prayerJourney(groundHome(actor.welcome!.origin??actorHome(actor)),groundHome(actorHome(actor)),row,lane,now):undefined;
      if(journey&&!this.traffic.reserve(actor.key,[journey.outbound,journey.inbound],now,true))continue;
      occupied.add(slot);actor.welcome={...actor.welcome!,startedAt:now,lane,row,...(journey?{journey,durationMs:journey.endsAt-now}:{})};
    }
  }
  get ritualQueueLength() { return this.ritualQueue.length; }
  private queueRitual(actorId: string, effect: NonNullable<OfferingRitual['effect']>) {
    // Animate known visitors, seated or standing; gifts from non-visitors still count.
    if (!this.actors.has(actorId)) return;
    if (this.activeRitual?.actorId === actorId&&this.activeRitual.source!=='comment' || this.ritualQueue.some(e => e.actorId === actorId)) return;
    if (this.ritualQueue.length >= 16) { this.log('Hàng chờ thắp hương đã đầy, quà vẫn được ghi nhận'); return; }
    this.ritualQueue.push({ actorId, enqueuedAt: this.now(), effect });
  }
  private manageRitual(now: number) {
    this.freeIncense=this.freeIncense.filter(e=>{const keep=now-e.enqueuedAt<60000&&this.actors.has(e.actorId);if(!keep)this.incenseCounts.expired++;return keep;});
    const active = this.activeRitual;
    if (active) {
      const actor = this.actors.get(active.actorId);
      if (!actor || actor.seatId !== active.seatId || now-active.startedAt >= active.durationMs) {
        if(active.source==='comment')this.incenseCounts.completed++;
        this.traffic.release(active.actorId);this.activeRitual=undefined;
      } else {
        // Never let an active devotee expire mid-ceremony.
        return;
      }
    }
    this.ritualQueue=this.ritualQueue.filter(e => now-e.enqueuedAt < 150000 && this.actors.has(e.actorId));
    if([...this.actors.values()].some(a=>a.welcome?.startedAt!==undefined&&(a.welcome.row??0)===0))return;
    const ready=(e:{actorId:string}) => {
      const actor=this.actors.get(e.actorId);
      if(actor&&isStanding(actor)){this.showStanding(actor);if(actor.standingSlot===undefined)return false;}
      return actor && !actor.welcome && !actor.travel && (actor.status==='idle' || actor.status==='pray' || actor.status==='standing');
    };
    const queue=this.ritualQueue.length?this.ritualQueue:this.freeIncense;
    const source=queue===this.freeIncense?'comment' as const:'gift' as const;
    const readyIndex=queue.findIndex(ready);
    if (readyIndex<0) return;
    const next=queue[readyIndex];
    const actor=this.actors.get(next.actorId)!;
    const home=groundHome(actorHome(actor)),journey=this.ordered?ceremonyJourney(home,home,{x:540,y:1080},now,this.settings.walkSpeed,2020):undefined;
    if(journey&&!this.traffic.reserve(actor.key,[journey.outbound,journey.inbound],now))return;
    queue.splice(readyIndex,1);
    this.activeRitual={actorId:actor.key,seatId:actor.seatId,startedAt:now,durationMs:journey?journey.endsAt-now:7200,effect:next.effect,source,...(journey?{journey}:{})};
    this.log(`${actor.displayName} lên thắp hương`);
  }
  private effectTimes: number[] = []; private lastLikeAt = 0;
  private requestIncense(actor:Actor,now:number){
    if(!this.ordered){this.toast('Bật Sàn V2 để dùng lệnh thắp nhang');return;}
    const key=`incense:${actor.key}`;
    if((this.cooldowns.get(key)??0)>now){this.incenseCounts.cooldown++;return;}
    if(this.activeRitual?.actorId===actor.key||this.freeIncense.some(r=>r.actorId===actor.key)||this.ritualQueue.some(r=>r.actorId===actor.key)||this.freeIncense.length>=32){this.incenseCounts.busy++;return;}
    this.cooldowns.set(key,now+interactionCooldownMs);this.freeIncense.push({actorId:actor.key,enqueuedAt:now,effect:'rose'});
  }
  private manageTravel(now:number){
    this.traffic.expire(now);
    for(const actor of this.actors.values()){
      const t=actor.travel;if(!t)continue;
      if(t.route&&now>=t.route.endsAt){delete actor.travel;delete actor.transitionFrom;actor.status=t.kind==='standing'?'standing':'idle';actor.statusAt=now;this.traffic.release(actor.key);continue;}
      if(!t.route){const r=homeRoute(t.from,t.to,now,this.settings.walkSpeed);if(this.traffic.reserve(actor.key,[r],now))t.route=r;}
    }
  }
  clearFortuneDisplay() {
    this.fortunes.clearDisplay();
    for(const event of this.pending)delete event.fortuneIntent;
    this.actions=this.actions.filter(a=>a.type!=='FORTUNE_REVEAL');
  }
  private counter = 0; private receiveTimes: number[] = [];
  clearLanternDisplay(){
    this.lanterns.clearDisplay();
    // Preserve actor joins but never replay a request when re-enabling or switching back.
    for(const event of this.pending)delete event.lanternIntent;
    this.actions=this.actions.filter(a=>a.type!=='LANTERN_REVEAL');
  }
  clearCommunityDisplay(){
    this.traffic.clear();this.freeIncense=[];
    for(const a of this.actors.values()){delete a.travel;delete a.welcome;if(a.status==='walk'||a.status==='enter'||a.status==='to-standing')a.status=isStanding(a)?'standing':'idle';}
    this.activeRitual=undefined;this.ritualQueue=[];
    this.environment.reset(this.now());
    this.cameraDirector.reset(this.now());
    this.giftShow.reset();
    this.treeEligible=new WeakSet();
    this.commentEffects.reset();this.tree.reset(this.settings.treeEnabled,this.settings.treeTarget);
    for(const actor of this.actors.values())delete actor.chantUntil;
    this.actions=this.actions.filter(a=>!['COMMENT_EFFECT','CHANT','TREE_BLOOM'].includes(a.type));
  }
  constructor(settings: Settings = defaultSettings, private now: () => number = Date.now) { this.settings = { ...settings };this.tree.configure(settings.treeEnabled,settings.treeTarget);this.environment.configure(settings,this.now());this.cameraDirector.configure(settings,this.now());this.selectCamera(settings.cameraRemember?settings.cameraView:'front'); }
  log(text: string) { this.logs.unshift({ id: ++this.counter, at: this.now(), text }); this.logs.length = Math.min(80, this.logs.length); }
  drop(reason: string, count = 1) { this.metrics.dropped += count; this.metrics.reasons[reason] = (this.metrics.reasons[reason] || 0) + count; this.log(`Bỏ sự kiện: ${reason}${count > 1 ? ` (${count})` : ''}`); return false; }
  receive(raw: unknown): boolean {
    const time = this.now(); this.metrics.received++; this.receiveTimes.push(time);
    if (this.receiveTimes.length > 4096) this.receiveTimes.shift();
    const validated = rawEventSchema.safeParse(raw);
    if (!validated.success) return this.drop('Dữ liệu hoặc danh tính không hợp lệ');
    const intent = validated.data.type === 'chat' ? parseFortuneCommand(validated.data.text) : null;
    const lanternIntent = validated.data.type === 'chat' ? parseLanternCommand(validated.data.text) : null;
    const event = normalizeEvent(validated.data, this.sessionId, time);
    if (!event) return this.drop('Dữ liệu hoặc danh tính không hợp lệ');
    if (this.provider !== 'connected') return this.drop('Nguồn sự kiện chưa kết nối');
    const eventKey = event.eventId ? `${event.source}:${event.scope || this.sessionId}:${event.eventId}${event.gift?`:${event.gift.finished}:${event.gift.count}`:""}` : undefined;
    if (eventKey && (this.seen.get(eventKey) ?? 0) > time) return this.drop('Trùng event ID');
    if (this.pending.length >= 2048) return this.drop('Hàng đợi sự kiện đầy');
    if (eventKey) this.seen.set(eventKey, time + 30_000);
    if (intent) { event.fortuneIntent = intent; event.keyword = 'chat'; }
    if (lanternIntent) {event.lanternIntent=lanternIntent;event.keyword='chat';}
    if(event.type==='chat'&&!intent&&!lanternIntent){event.communityIntent=parseCommunityCommand(validated.data.text)??undefined;if(event.communityIntent)event.keyword='chat';}
    // The old substring matcher must not bypass the bounded bow/chant grammar.
    if(event.type==='chat'&&event.keyword==='pray'&&!event.communityIntent)event.keyword='chat';
    if(event.type==='chat')event.chatText=bubbleText(validated.data.text,this.settings.chatBlockedWords)??undefined;
    if(this.settings.treeEnabled&&event.type==='like')this.treeEligible.add(event);
    this.pending.push(event); return true;
  }
  private action(type: SceneAction['type'], actorId: string, gift?: SceneAction['gift']) {
    if (['LOTUS_BLOOM', 'GIFT_THANKS', 'LIKE_PULSE'].includes(type)) {
      this.effectTimes = this.effectTimes.filter(time => this.now() - time < 1000);
      if (this.effectTimes.length >= 6) { this.drop('Giới hạn 6 hiệu ứng mỗi giây'); return; }
      this.effectTimes.push(this.now());
    }
    if (this.actions.length < 128) this.actions.push({ id: ++this.counter, type, actorId, at: this.now(), ...(gift ? { gift } : {}) });
  }
  private toast(text: string) {
    if (this.toasts.length < 3) this.toasts.push({ id: ++this.counter, text, expiresAt: this.now() + 4000 });
  }
  private spawn(e:DomainEvent){
    const existing=this.actors.get(e.userKey);
    const occupied=new Set([...this.actors.values()].filter(a=>!isStanding(a)).map(a=>a.seatId));
    const candidates=seats.slice(0,this.settings.maxActors);
    if(this.ordered)candidates.sort((a,b)=>{const rank=(s:Seat)=>{const i=Number(s.id.slice(5));return Math.floor(i/10)*10+(i%5)*2+(i%10>=5?1:0);};return rank(a)-rank(b);});
    const seat=candidates.find(s=>!occupied.has(s.id));
    if(existing){
      if(!seat||existing.welcome||existing.travel||existing.key===this.activeRitual?.actorId||existing.status==='to-standing')return false;
      existing.transitionFrom=actorHome(existing);existing.seatId=seat.id;existing.status='walk';existing.statusAt=this.now();delete existing.standingSlot;delete existing.standingSince;
      if(this.ordered)existing.travel={from:groundHome(existing.transitionFrom),to:groundHome(seat),kind:'seat'};
      return true;
    }
    let hash=0;for(const c of e.userKey)hash=(hash*31+c.charCodeAt(0))>>>0;
    const now=this.now();const first=!this.welcomed.has(e.userKey);this.welcomed.add(e.userKey);
    const actor:Actor={key:e.userKey,displayName:e.displayName,seatId:seat?.id||`standing-${e.userKey}`,variant:hash%32,joinedAt:now,lastActiveAt:now,status:seat?'enter':'standing',statusAt:now,...(!seat?{standingSince:now}:{})};
    this.actors.set(e.userKey,actor);if(!seat)this.showStanding(actor);if(first)this.requestBow(actor,now,true);
    this.metrics.newActors++;this.action('USER_JOINED',e.userKey);return Boolean(seat);
  }
  private process(e: DomainEvent) {
    const now = this.now();
    if (e.type === 'member' && !this.settings.autoJoinMember) { this.drop('Tự vào theo member đang tắt'); return; }
    if (e.type === 'like') {
      this.metrics.likeUnits += e.likeCount || 0;
      if(this.tree.receive(e.likeCount||0,e.eventId?`${e.source}:${e.scope||this.sessionId}:${e.eventId}`:undefined,now,this.treeEligible.has(e)))this.action('TREE_BLOOM','');
      if (this.settings.likeEffects && this.settings.effects && now - this.lastLikeAt >= 1000) { this.lastLikeAt = now; this.action('LIKE_PULSE', ''); }
      return; // Never create actors from likes.
    }
    if(e.type==='gift'&&!e.gift?.finished){
      this.giftShow.progress(e,this.sessionId,now,this.settings);return;
    }
    let fortuneResult:string|undefined;
    let lanternResult:string|undefined;
    if(e.type==='chat'&&e.lanternIntent){
      if(this.settings.lanternEnabled)lanternResult=this.lanterns.onIntent({sessionId:this.sessionId,userKey:e.userKey,displayName:e.displayName,eventId:e.eventId?`${e.source}:${e.scope||this.sessionId}:${e.eventId}`:undefined,topic:e.lanternIntent,now});
      else {this.lanterns.disabled();lanternResult='disabled';}
    }
    if (e.type === 'chat' && e.fortuneIntent) {
      if (this.settings.fortuneEnabled) fortuneResult=this.fortunes.onIntent({sessionId:this.sessionId,userKey:e.userKey,displayName:e.displayName,eventId:e.eventId?`${e.source}:${e.scope||this.sessionId}:${e.eventId}`:undefined,intent:e.fortuneIntent,now});
      else {this.fortunes.disabled();fortuneResult='disabled';}
    }
    let actor = this.actors.get(e.userKey);
    const canJoin = e.type === 'member' || (e.type === 'chat' && (this.settings.autoJoinChat||e.communityIntent?.kind==='seat'));
    if (!actor && canJoin) {
      if (!this.participants.has(e.userKey) && this.participants.size >= 10000) { this.drop('Giới hạn phiên 10000 người'); return; }
      this.participants.add(e.userKey);
      if (!this.waiting.has(e.userKey)) {
        if (!this.spawn(e)) this.waiting.set(e.userKey, e);
      }
      actor = this.actors.get(e.userKey);
    }
    if (actor) { actor.lastActiveAt = now; actor.displayName = e.displayName;this.showStanding(actor); }
    if(this.ordered&&e.type==='member'&&actor&&!actor.welcome)this.requestBow(actor,now);
    if(actor&&e.communityIntent?.kind==='seat'&&isStanding(actor)&&!this.waiting.has(e.userKey))this.waiting.set(e.userKey,e);
    if (this.waiting.has(e.userKey)) this.waiting.set(e.userKey, e);
    // Emit before feature cooldown returns: the bubble is a comment, not an acceptance receipt.
    if(e.type==='chat' && actor && actor.status!=='exit' && this.settings.showBubbles && e.chatText){
      const key=`bubble:${e.userKey}`;
      const text=bubbleText(e.chatText,this.settings.chatBlockedWords);
      if(text && (this.cooldowns.get(key)??0)<=now && this.actions.length<128){
        this.cooldowns.set(key,now+2000);
        this.actions.push({id:++this.counter,type:'CHAT_BUBBLE',actorId:actor.key,at:now,bubble:{text,expiresAt:now+4000}});
      }
    }
    // Waiting-room records must never replay a past chat when a seat becomes free.
    if(this.waiting.has(e.userKey))delete this.waiting.get(e.userKey)!.chatText;
    if(lanternResult){
      if(lanternResult==='cooldown')this.toast(`${e.displayName}: chờ ${this.lanterns.remainingCooldown(e.userKey,now)} giây để thả hoa đăng tiếp.`);
      else if(lanternResult==='busy')this.toast('Hàng hoa đăng đang đầy. Xin thử lại sau.');
      else if(lanternResult==='disabled')this.toast('Tính năng hoa đăng đang tắt.');
      return;
    }
    if (fortuneResult) {
      if(fortuneResult==='cooldown')this.toast(`${e.displayName}: chờ ${this.fortunes.remainingCooldown(e.userKey,now)} giây để xin quẻ tiếp.`);
      else if(fortuneResult==='busy')this.toast('Hàng quẻ đang đầy. Xin thử lại sau.');
      else if(fortuneResult==='disabled')this.toast('Tính năng xin quẻ đang tắt.');
      else if(fortuneResult==='unavailable')this.toast('Kho quẻ chưa sẵn sàng.');
      // A fortune request is not a normal greeting/prayer, including rejected requests.
      return;
    }
    if(e.communityIntent?.kind==='bow'){if(actor)this.requestBow(actor,now);return;}
    if(e.communityIntent?.kind==='incense'){if(actor)this.requestIncense(actor,now);return;}
    if(e.communityIntent?.kind==='seat')return;
    if(e.communityIntent?.kind==='effect'){
      if(this.settings.commentEffectsEnabled)this.commentEffects.request(e.userKey,e.communityIntent.effect,now,e.displayName,e.avatarUrl);
      return;
    }
    if(e.communityIntent?.kind==='chant'){
      if(actor){const key=`chant:${actor.key}`;if((this.cooldowns.get(key)??0)<=now){this.cooldowns.set(key,now+interactionCooldownMs);actor.chantUntil=now+4000;this.action('CHANT',actor.key);}}
      return;
    }
    if (e.type === 'gift') {
      if(e.gift)e.gift={...e.gift,count:this.giftShow.finalCount(e,this.sessionId)};
      const confirmed = this.gifts.confirm(e, this.settings, this.sessionId);
      if (!confirmed) { this.drop('Trùng giao dịch quà hoặc đầy bộ nhớ chống trùng phiên'); return; }
      const streakKey = e.gift?.streakId ? `gift:${e.userKey}:${e.gift.id}:${e.gift.streakId}` : undefined;
      if (streakKey && (this.seen.get(streakKey) ?? 0) > now) { this.drop('Trùng gift streak'); return; }
      if (streakKey) this.seen.set(streakKey, now + 120_000);
      this.commentEffects.preempt(now);
      this.environment.gift(now);
      this.giftShow.enqueue(confirmed,now,this.settings);
      this.queueRitual(e.userKey, confirmed.mappedEffect);
      this.metrics.giftUnits += e.gift!.count; this.metrics.giftTransactions++;
      if (this.actions.length < 128) this.actions.push({ id:++this.counter,type:'GIFT_CONFIRMED',actorId:e.userKey,at:now,confirmedGift:confirmed });
      if (this.settings.showGiftThanks) this.toast(`${confirmed.displayName} tặng ${confirmed.giftName} ×${confirmed.units} · ${confirmed.actionLabel}`);
    }
    const rateKey = `${e.userKey}:${e.type === 'gift' ? 'gift' : e.keyword}`;
    if ((this.cooldowns.get(rateKey) ?? 0) > now) { this.drop('Cooldown 5 giây'); return; }
    this.cooldowns.set(rateKey, now + interactionCooldownMs);
    this.recent = [e.displayName, ...this.recent.filter(n => n !== e.displayName)].slice(0, 5);
    if (e.type === 'gift') {
      if (this.settings.showGiftThanks) this.action('GIFT_THANKS', e.userKey, { id: e.gift!.id, count: e.gift!.count, displayName: e.displayName });
      this.log(`${e.source === 'demo' ? 'Quà thử' : 'Cảm ơn quà'} · ${e.displayName}`); return;
    }
    if (e.source === 'tiktok' && e.keyword !== 'chat' && actor && (actor.welcome || ['enter', 'walk', 'kneel'].includes(actor.status))) {
      this.deferred.set(e.userKey, { keyword: e.keyword, expiresAt: now + 30000 });
      this.log(`Chờ ngồi để ${e.keyword === 'lotus' ? 'cầu an' : 'lễ Phật'} · ${e.displayName}`); return;
    }
    if (actor && actor.status !== 'exit' && e.keyword !== 'chat') {
      if (actor.status === 'idle' || actor.status === 'pray') { actor.status = 'pray'; actor.statusAt = now; }
      this.action(e.keyword === 'lotus' ? 'LOTUS_BLOOM' : 'PRAY', actor.key);
      if (e.keyword === 'lotus') this.toast(`${e.displayName} cầu bình an`);
    }
    this.log(`${e.type === 'member' ? 'Vào cửa' : e.keyword === 'lotus' ? 'Cầu an' : e.keyword === 'pray' ? 'Lễ Phật' : 'Ghé thăm'} · ${e.displayName}`);
  }
  tick() {
    const now = this.now();
    this.manageTravel(now);
    this.finishWelcomes(now);
    this.tree.tick(now);
    this.giftShow.tick(now,this.settings,[this.fortunes.snapshot(now),this.lanterns.snapshot(now)].some(c=>c&&cardPresentation(c,now).visible),{settings:this.settings,camera:this.camera,fortune:this.fortunes.snapshot(now),lantern:this.lanterns.snapshot(now),tree:this.tree.snapshot()});
    this.toasts = this.toasts.filter(t => t.expiresAt > now);
    for (const [key, expiry] of this.seen) if (expiry <= now) this.seen.delete(key);
    for (const [key, expiry] of this.cooldowns) if (expiry <= now) this.cooldowns.delete(key);
    for (const [key, pending] of this.deferred) if (pending.expiresAt <= now) { this.deferred.delete(key); this.drop('Hành động chờ ngồi hết hạn 30 giây'); }
    for (const event of this.pending.splice(0, 30)) this.process(event);
    const duration: Record<Actor['status'], number> = { enter: 300, walk: 2800, kneel: 550, pray: 1800, idle: Infinity, standing:Infinity, 'to-standing':1800, exit: 1800 };
    const next: Partial<Record<Actor['status'], Actor['status']>> = { enter: 'walk', walk: 'kneel', kneel: 'pray', pray: 'idle', 'to-standing':'standing' };
    for (const [key, actor] of this.actors) {
      const protectedVisit=Boolean(actor.travel)||(this.ordered?Boolean(actor.welcome):actor.welcome?.startedAt!==undefined)||actor.key===this.activeRitual?.actorId;
      if(!isStanding(actor)&&!protectedVisit&&now-actor.lastActiveAt>=this.settings.idleMinutes*60000)this.leaveSeat(actor,now);
      if(isStanding(actor)&&!protectedVisit&&actor.status!=='to-standing'&&now-Math.max(actor.standingSince??0,actor.lastActiveAt)>=this.settings.standingMinutes*60000)delete actor.standingSlot;
      const elapsed = (now - actor.statusAt) * this.settings.animationSpeed;
      if (!actor.travel&&!(this.ordered&&actor.welcome)&&elapsed >= duration[actor.status]) {
        if (actor.status === 'exit') { this.actors.delete(key); continue; }
        const status = next[actor.status]; if (status) { actor.status = status==='idle'&&isStanding(actor)?'standing':status; actor.statusAt = now;if(status==='standing')delete actor.transitionFrom; }
      }
      const deferred = this.deferred.get(key);
      if (deferred && !actor.welcome && (actor.status === 'pray' || actor.status === 'idle')) {
        this.deferred.delete(key); actor.status = 'pray'; actor.statusAt = now;
        this.action(deferred.keyword === 'lotus' ? 'LOTUS_BLOOM' : 'PRAY', key);
        if (deferred.keyword === 'lotus') this.toast(`${actor.displayName} cầu bình an`);
      }
    }
    this.manageRitual(now);
    this.environment.tick(now,this.environmentBusy());
    // A lowered seat limit takes effect as soon as protected ceremonies finish.
    for(const a of [...this.actors.values()].filter(a=>!isStanding(a)).slice(this.settings.maxActors)){
      if(a.welcome?.startedAt===undefined&&a.key!==this.activeRitual?.actorId)this.leaveSeat(a,now);
    }
    this.startWelcomes(now);
    for(const effect of this.commentEffects.tick(now,this.sessionId,Boolean(this.activeRitual||this.giftShow.snapshot().active.length),this.settings.commentEffectsEnabled&&this.settings.effects)){
      if(this.actions.length<128)this.actions.push({id:++this.counter,type:'COMMENT_EFFECT',actorId:effect.actorId,at:now,commentEffect:effect});
    }
    this.lanterns.expire(now);
    // One shared display slot. Alternate eligible queues without interrupting an active card.
    if(!this.fortunes.snapshot(now)&&!this.lanterns.snapshot(now)&&this.actions.length<128){
      const fortuneReady=this.settings.fortuneEnabled&&this.fortunes.ready(now,this.settings.fortuneIntervalSeconds*1000);
      const lanternReady=this.settings.lanternEnabled&&this.lanterns.ready(now);
      if(lanternReady&&(!fortuneReady||this.lastDisplay==='fortune')){
        const lantern=this.lanterns.next(now)!;this.lastDisplay='lantern';
        this.actions.push({id:++this.counter,type:'LANTERN_REVEAL',actorId:'',at:now,lantern});
      }else if(fortuneReady){
        const fortune=this.fortunes.next(now,this.settings.fortuneIntervalSeconds*1000,this.settings.fortuneVoiceEnabled)!;this.lastDisplay='fortune';
        this.actions.push({id:++this.counter,type:'FORTUNE_REVEAL',actorId:'',at:now,fortune});
      }
    }
    while (this.waiting.size && this.seatedCount() < this.settings.maxActors) {
      const [key, event] = this.waiting.entries().next().value!;
      if (!this.spawn(event)) break;
      this.waiting.delete(key);
    }
    const cameraBusy=this.activeRitual||this.ritualQueue.length?'Đang dâng hương':this.giftShow.snapshot().active.length?'Đang trình diễn quà':this.commentEffects.snapshot().length?'Đang hiện hiệu ứng bình luận':this.fortunes.snapshot(now)||this.lanterns.snapshot(now)?'Đang đọc thẻ nội dung':this.tree.snapshot().phase==='bloom'?'Cây phúc lành đang nở':undefined;
    const giftsOnScreen=this.giftShow.snapshot().active.length;
      const cardOnScreen=[this.fortunes.snapshot(now),this.lanterns.snapshot(now)].some(c=>c&&cardPresentation(c,now).visible);
      const tightOblique=this.settings.templeFloorPreview&&this.settings.theme==='golden'&&this.settings.sceneSpace==='hall'&&['left','right'].includes(this.cameraDirector.state.view);
      // The new lower altar cannot fit a full 1.3x donor above a compact card
      // without exposing the background edge. Keep the card and highlight instead.
      const cardBlocksFocus=tightOblique&&!this.activeRitual?.journey&&this.settings.liveSafeLayout&&cardOnScreen;
      this.cameraDirector.tick(now,cameraBusy,this.settings.cameraFade&&!this.settings.reducedEffects,this.activeRitual,!cardBlocksFocus&&this.activeRitual?.source!=='comment'&&giftsOnScreen<3&&(this.settings.compactGiftPanels||giftsOnScreen===0));
    this.receiveTimes = this.receiveTimes.filter(time => now - time < 1000);
    this.metrics.perSecond = this.receiveTimes.length; this.metrics.pending = this.pending.length;
  }
  updateSettings(patch: unknown) {
    const wasOrdered=this.ordered;
    const settings = settingsSchema.parse({ ...this.settings, ...settingsPatchSchema.parse(patch) });
    settings.templeName = cleanText(settings.templeName, 48) || defaultSettings.templeName;
    if(settings.treeEnabled!==this.settings.treeEnabled)this.treeEligible=new WeakSet();
    this.cameraDirector.configure(settings,this.now());
    this.settings = settings;
    if(wasOrdered&&!this.ordered){this.traffic.clear();this.freeIncense=[];for(const a of this.actors.values()){delete a.travel;delete a.welcome;delete a.transitionFrom;a.status=isStanding(a)?'standing':'idle';}this.activeRitual=undefined;}
    this.environment.configure(settings,this.now());
    this.tree.configure(settings.treeEnabled,settings.treeTarget);
    if(!settings.fortuneEnabled)this.clearFortuneDisplay();
    if(!settings.lanternEnabled)this.clearLanternDisplay();
    // Preserve FIFO and the hard cap immediately when lowering capacity.
    const overflow = [...this.actors.values()].filter(a=>!isStanding(a)).slice(settings.maxActors);
    for(const a of overflow){
      if(a.welcome?.startedAt!==undefined||a.key===this.activeRitual?.actorId)continue;
      this.leaveSeat(a,this.now());
    }
    this.log('Đã cập nhật cài đặt');
  }
  reset() {
    this.traffic.clear();this.freeIncense=[];this.incenseCounts={completed:0,expired:0,cooldown:0,busy:0};
    this.environment.reset(this.now());
    this.cameraDirector.reset(this.now());
    this.giftShow.reset();
    this.commentEffects.reset();
    this.tree.reset(this.settings.treeEnabled,this.settings.treeTarget);
    this.treeEligible=new WeakSet();
    this.welcomed.clear();this.prayerCounts={completed:0,expired:0,cooldown:0,busy:0};
    this.gifts.reset();
    this.sessionId = randomUUID(); this.actors.clear(); this.waiting.clear(); this.participants.clear(); this.pending = []; this.seen.clear(); this.cooldowns.clear(); this.recent = []; this.toasts = []; this.logs = []; this.actions = []; this.receiveTimes = []; this.deferred.clear(); this.activeRitual = undefined; this.ritualQueue = []; this.effectTimes = []; this.lastLikeAt = 0;
    this.fortunes.reset(this.sessionId);
    this.lanterns.reset(this.sessionId);this.lastDisplay='lantern';
    Object.assign(this.metrics, { received: 0, dropped: 0, reasons: {}, perSecond: 0, pending: 0, newActors: 0, giftUnits: 0, giftTransactions: 0, likeUnits: 0 });
    this.log('Đã xoá dữ liệu phiên');
  }
  snapshot(): SceneState {
    this.lanterns.expire(this.now());
    return { movement:{enabled:this.ordered,moving:this.traffic.moving(this.now()),waiting:[...this.actors.values()].filter(a=>a.travel&&!a.travel.route||a.welcome&&a.welcome.startedAt===undefined).length,incenseQueued:this.freeIncense.length,incenseCompleted:this.incenseCounts.completed,incenseExpired:this.incenseCounts.expired,incenseCooldown:this.incenseCounts.cooldown,incenseBusy:this.incenseCounts.busy},camera:{...this.camera},giftShow:this.giftShow.snapshot(),environment:this.environment.snapshot(),tree:this.tree.snapshot(),commentEffects:this.commentEffects.snapshot(),commentEffectStatus:this.commentEffects.status(),room:{seated:this.seatedCount(),standing:[...this.actors.values()].filter(isStanding).length,visibleStanding:[...this.actors.values()].filter(a=>isStanding(a)&&a.standingSlot!==undefined).length},prayerStatus:{...this.prayerCounts,queued:[...this.actors.values()].filter(a=>a.welcome&&a.welcome.startedAt===undefined).length,active:[...this.actors.values()].filter(a=>a.welcome?.startedAt!==undefined).length}, lantern:this.lanterns.snapshot(this.now()), lanternStatus:this.lanterns.status(), fortune:this.fortunes.snapshot(this.now()), fortuneStatus:this.fortunes.status(), ...(this.activeRitual ? {ritual: {...this.activeRitual}} : {}), leaderboard: this.gifts.ranking(), recentGifts: [...this.gifts.recent], observedGifts: [...this.gifts.observed], sessionId: this.sessionId, revision: this.revision, serverTime: this.now(), settings: { ...this.settings }, actors: [...this.actors.values()].filter(a=>!isStanding(a)||a.standingSlot!==undefined).map(a => ({ ...a, ...(a.welcome?{welcome:{...a.welcome}}:{}) })), queue: this.waiting.size, total: this.participants.size, recent: [...this.recent], toasts: [...this.toasts], logs: [...this.logs], metrics: { ...this.metrics, reasons: { ...this.metrics.reasons } }, provider: this.provider, mode: this.mode, connection: { ...this.connection, received: { ...this.connection.received } } };
  }
}
