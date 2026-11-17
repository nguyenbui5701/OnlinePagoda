import type { BlessingTreeState } from '@vuonsen/shared';

/** Count deltas, never TikTok's cumulative room total. One celebration can absorb many goals. */
export class BlessingTree {
  private state:BlessingTreeState={enabled:false,phase:'growing',target:1000,nextTarget:1000,progress:0,total:0,completed:0,cycle:0};
  private seen=new Set<string>();
  configure(enabled:boolean,target:number){
    if(enabled!==this.state.enabled){
      this.state={enabled,phase:'growing',target,nextTarget:target,progress:0,total:0,completed:0,cycle:0};
      // Keep dedupe when toggling: an old packet must not become a new like.
    }else this.state.nextTarget=target;
  }
  receive(count:number,id:string|undefined,now:number,eligibleAtReceive=true){
    if(!Number.isSafeInteger(count)||count<=0)return false;
    if(id){if(this.seen.has(id))return false;this.seen.add(id);}
    if(!this.state.enabled||!eligibleAtReceive)return false;
    this.tick(now);
    this.state.total+=count;this.state.progress+=count;
    if(this.state.phase==='growing'&&this.state.progress>=this.state.target){
      this.state.phase='bloom';this.state.startedAt=now;this.state.endsAt=now+8000;this.state.cycle++;
      return true;
    }
    return false;
  }
  tick(now:number){
    const s=this.state;
    if(s.phase==='bloom'&&now>=s.endsAt!){
      s.completed+=Math.floor(s.progress/s.target);s.progress%=s.target;
      s.target=s.nextTarget;s.phase='growing';delete s.startedAt;delete s.endsAt;
      // A smaller next target can consume carried likes, but doesn't start a cascade of animations.
      s.completed+=Math.floor(s.progress/s.target);s.progress%=s.target;
    }
  }
  snapshot(){return {...this.state};}
  reset(enabled:boolean,target:number){this.seen.clear();this.state.enabled=!enabled;this.configure(enabled,target);}
}
