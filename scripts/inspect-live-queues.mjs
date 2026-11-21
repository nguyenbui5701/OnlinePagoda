// Read-only local diagnostics: no commands, usernames, chat or gift identities.
import {io} from 'socket.io-client';
const socket=io(`http://127.0.0.1:${Number(process.env.PORT||3000)}`,{auth:{role:'dashboard'},reconnection:false,timeout:2000});
const timer=setTimeout(()=>{console.log('No local snapshot available');socket.close();},4000);
socket.on('connect_error',()=>{clearTimeout(timer);console.log('Local server unavailable');socket.close();});
socket.on('snapshot',v=>{
 clearTimeout(timer);const actors=v.actors||[],now=v.serverTime;
 console.log(JSON.stringify({mode:v.mode,room:v.room,queue:v.queue,
  settings:{maxActors:v.settings.maxActors,idleMinutes:v.settings.idleMinutes,autoJoinMember:v.settings.autoJoinMember,ordered:v.settings.templeFloorPreview,walkSpeed:v.settings.walkSpeed},
  statuses:actors.reduce((r,a)=>(r[a.status]=(r[a.status]||0)+1,r),{}),
  prayer:v.prayerStatus,movement:v.movement,
  oldWelcome:actors.filter(a=>a.welcome&&now-a.welcome.queuedAt>60000).length,
  unstartedTravel:actors.filter(a=>a.travel&&!a.travel.route).length,
  pending:v.metrics.pending,fps:v.metrics.fps,fortune:v.fortuneStatus,lantern:v.lanternStatus,comment:v.commentEffectStatus,
  gift:{queued:v.giftShow?.queued,active:v.giftShow?.active?.length}},null,2));socket.close();
});
