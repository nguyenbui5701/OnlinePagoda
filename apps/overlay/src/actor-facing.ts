export type ActorFacing = 'front' | 'back' | 'left' | 'right';
export interface FacingMotion {
  ritualPhase?: string;
  welcomePhase?: string;
  status: string;
  fromY?: number;
  toY?: number;
  idleWalking?: boolean;
  idleDeltaY?: number;
  deltaX?: number;
  deltaY?: number;
}
/** Use scene choreography, not camera/screen movement; also works on reload. */
export function actorFacing(m: FacingMotion): ActorFacing {
  const dx=m.deltaX??0,dy=m.deltaY??0;
  const side:ActorFacing|undefined=Math.abs(dx)>.02&&Math.abs(dx)>Math.abs(dy)*1.3?(dx<0?'left':'right'):undefined;
  const moving=side??(Math.abs(dy)>.02?(dy>0?'front':'back'):undefined);
  if (m.ritualPhase && m.ritualPhase !== 'done')
    return m.ritualPhase==='offer'?'back':moving??(m.ritualPhase === 'back-aisle' || m.ritualPhase === 'back-seat' ? 'front' : 'back');
  if (m.welcomePhase) return ['approach','return'].includes(m.welcomePhase)?moving??(m.welcomePhase === 'return' ? 'front' : 'back'):'back';
  if (m.status === 'exit') return side??'front';
  if (m.status === 'walk' || m.status === 'to-standing')
    return moving??(m.fromY !== undefined && m.toY !== undefined && m.toY > m.fromY ? 'front' : 'back');
  if (m.idleWalking) return side??((m.idleDeltaY ?? 0) >= 0 ? 'front' : 'back');
  return 'back';
}
