import {expect,it} from 'vitest';
import {actorFacing} from '../apps/overlay/src/actor-facing';

it('keeps the altar-facing back during approach and prayer, then shows the front on return',()=>{
  for(const phase of ['waiting','approach','pray','settle'])expect(actorFacing({status:'idle',welcomePhase:phase})).toBe('back');
  expect(actorFacing({status:'idle',welcomePhase:'return'})).toBe('front');
  expect(actorFacing({status:'idle'})).toBe('back');
});
it('prioritizes the actual gift ritual and keeps the return face across the sideways aisle leg',()=>{
  for(const phase of ['to-aisle','to-urn','offer'])expect(actorFacing({status:'idle',ritualPhase:phase,welcomePhase:'return'})).toBe('back');
  for(const phase of ['back-aisle','back-seat'])expect(actorFacing({status:'idle',ritualPhase:phase,welcomePhase:'approach'})).toBe('front');
  expect(actorFacing({status:'idle',ritualPhase:'done'})).toBe('back');
});
it('handles seat changes, going outside and idle steps without camera or previous-frame state',()=>{
  expect(actorFacing({status:'walk',fromY:1800,toY:1300})).toBe('back');
  expect(actorFacing({status:'to-standing',fromY:1300,toY:1800})).toBe('front');
  expect(actorFacing({status:'exit'})).toBe('front');
  expect(actorFacing({status:'idle',idleWalking:true,idleDeltaY:1})).toBe('front');
  expect(actorFacing({status:'idle',idleWalking:true,idleDeltaY:-1})).toBe('back');
  expect(actorFacing({status:'pray',idleWalking:false})).toBe('back');
});
it('faces horizontally along walking paths, but keeps prayer and seated poses toward the altar',()=>{
  expect(actorFacing({status:'walk',deltaX:-30,deltaY:2})).toBe('left');
  expect(actorFacing({status:'idle',ritualPhase:'back-seat',deltaX:30,deltaY:0})).toBe('right');
  expect(actorFacing({status:'idle',welcomePhase:'return',deltaX:-30,deltaY:1})).toBe('left');
  expect(actorFacing({status:'idle',idleWalking:true,deltaX:3,deltaY:1})).toBe('right');
  expect(actorFacing({status:'idle',ritualPhase:'offer',deltaX:30,deltaY:0})).toBe('back');
  expect(actorFacing({status:'idle',welcomePhase:'pray',deltaX:30,deltaY:0})).toBe('back');
  expect(actorFacing({status:'idle',deltaX:30,deltaY:0})).toBe('back');
  expect(actorFacing({status:'walk',fromY:1800,toY:1100,deltaX:1,deltaY:-30})).toBe('back');
});
