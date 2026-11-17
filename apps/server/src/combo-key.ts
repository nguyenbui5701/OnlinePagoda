import {createHash} from 'node:crypto';
import type {DomainEvent} from '@vuonsen/shared';
export function comboKey(e:DomainEvent,session:string){
  return e.gift?.streakId?createHash('sha256').update(JSON.stringify([session,e.source,e.scope,e.userKey,e.gift.id,e.gift.streakId])).digest('hex'):undefined;
}
