export interface NamePlate {key:string;x:number;y:number;width:number;height:number;priority:number;seated?:boolean}
/** Screen-space offsets: zoom changes neither text size nor collision clearance. */
export function layoutNames(plates:NamePlate[]){
 const placed:NamePlate[]=[],result=new Map<string,{dx:number;dy:number;visible:boolean}>();
 for(const p of [...plates].sort((a,b)=>b.priority-a.priority||a.key.localeCompare(b.key))){
  if(p.seated){result.set(p.key,{dx:0,dy:0,visible:p.x+p.width>8&&p.x<1072});placed.push(p);continue;}
  let chosen:{dx:number;dy:number;visible:boolean}|undefined;
  for(const dy of [0,-30,-60])for(const dx of [0,-16,16]){
   if(chosen)break;
   const q={...p,x:p.x+dx,y:p.y+dy};
   if(q.x<8||q.x+q.width>1072||q.y<210||q.y+q.height>1910)continue;
   if(placed.some(a=>q.x<a.x+a.width+3&&q.x+q.width+3>a.x&&q.y<a.y+a.height+3&&q.y+q.height+3>a.y))continue;
   chosen={dx,dy,visible:true};placed.push(q);
  }
  result.set(p.key,chosen??{dx:0,dy:0,visible:false});
 }
 return result;
}
