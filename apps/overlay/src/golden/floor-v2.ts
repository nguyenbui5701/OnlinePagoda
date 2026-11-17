import {Container,Graphics,MeshPlane,Texture} from 'pixi.js';
import {floorPoint,floorCushionPoint,floorHome,carpetV2,carpetPatches,carpetSourceRow,seats,type CameraView} from '@vuonsen/shared';

function surface(carpet:boolean,width=512,height=1024){
 const c=document.createElement('canvas'),density=Math.min(2,2048/Math.max(width,height));c.width=Math.ceil(width*density);c.height=Math.ceil(height*density);const ctx=c.getContext('2d')!;ctx.scale(density,density);
 ctx.fillStyle=carpet?'#64201d':'#402019';ctx.fillRect(0,0,width,height);
 if(carpet){
  ctx.strokeStyle='#b58b4c';ctx.lineWidth=1.5;ctx.strokeRect(3,3,width-6,height-6);ctx.lineWidth=.7;ctx.strokeRect(7,7,width-14,height-14);
  if(height>60)for(let y=50;y<height-24;y+=95)for(let x=width<200?width/2:60;x<width-25;x+=95){ctx.save();ctx.translate(x,y);ctx.strokeStyle='#bd955b';ctx.fillStyle='#92703d';
   for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(0,3);ctx.bezierCurveTo(-8,13,-7,24,0,29);ctx.bezierCurveTo(7,24,8,13,0,3);ctx.fill();ctx.stroke();}
   ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fillStyle='#e1bc77';ctx.fill();
   for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*14,29);ctx.bezierCurveTo(side*44,38,side*40,60,side*16,59);ctx.bezierCurveTo(side*3,58,side*10,42,side*22,48);ctx.stroke();}
   ctx.restore();}
 }
 return Texture.from(c);
}
/** The clean B/C/D architecture already has uninterrupted wood: preserve its grain and columns. */
export function createFloorPreview(hall:Texture){
 // Rectify and repeat a sharp band from the original runner in UV space.
 // Sampling the whole photograph retained far/near scale differences and blur.
 const band=document.createElement('canvas');band.width=384;band.height=400;
 const ctx=band.getContext('2d')!,image=hall.source.resource as CanvasImageSource;
 for(let row=0;row<400;row++){
  const {left,right,y}=carpetSourceRow(row/1600);
  const next=carpetSourceRow(Math.min(399.99,row+1)/1600);
  ctx.drawImage(image,left/941*hall.width,y/1672*hall.height,(right-left)/941*hall.width,Math.max(.5,next.y-y)/1672*hall.height,0,row,384,1);
 }
 // Overlap the tail and head of the band before repeating it. Directly
 // concatenating their different colours/borders created visible cut lines.
 const tile=document.createElement('canvas');tile.width=384;tile.height=352;
 const tc=tile.getContext('2d')!;
 tc.drawImage(band,0,352,384,48,0,0,384,48);
 for(let row=0;row<48;row++){const t=row/47;tc.globalAlpha=t*t*(3-2*t);tc.drawImage(band,0,row,384,1,0,row,384,1);}
 tc.globalAlpha=1;tc.drawImage(band,0,48,384,304,0,48,384,304);
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=1408;
 const output=canvas.getContext('2d')!;for(let i=0;i<4;i++)output.drawImage(tile,0,i*352);
 const root=new Container(),rug=Texture.from(canvas),branch=surface(true,437,24),planes:{mesh:MeshPlane;x:number;y:number;w:number;h:number;nx:number;ny:number}[]=[];
 function plane(texture:Texture,x:number,y:number,w:number,h:number,nx=12,ny=20){const mesh=new MeshPlane({texture,verticesX:nx,verticesY:ny});root.addChild(mesh);planes.push({mesh,x,y,w,h,nx,ny});}
 const patches=carpetPatches();
 for(const p of patches){
  plane(p.kind==='aisle'?rug:branch,p.x,p.y,p.width,p.height,p.kind==='aisle'?12:8,p.kind==='aisle'?64:3);
  // Side paths remain legible but should not turn the whole wooden floor into a red grid.
  planes[planes.length-1].mesh.alpha=p.kind==='aisle'?1:.28;
 }
 const mainPlane=planes[planes.length-1];
 const mats=new Graphics();root.addChild(mats);let previous='';
 function update(view:CameraView,count:number){
  const key=view+':'+count;if(previous===key)return;previous=key;
  // A already contains the original polished floor AND lotus runner in the
  // temple-hall artwork. Preserve both; V2 only adds chairs in this view.
  // B/C/D still need their projected rugs over the supplied clean architecture.
  for(const p of planes)p.mesh.visible=view!=='front';
  for(const {mesh,x,y,w,h,nx,ny} of planes){const positions=mesh.geometry.getBuffer('aPosition').data as Float32Array;
   for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const pt=floorPoint(view,x+w*i/(nx-1),y+h*j/(ny-1)),k=(j*nx+i)*2;positions[k]=pt.x;positions[k+1]=pt.y;}
   mesh.geometry.getBuffer('aPosition').update();
  }
  mats.clear();
  for(const raw of seats.slice(0,count)){const s=floorHome(raw);
   const ellipse=(rx:number,ry:number,dy=0)=>{const points:number[]=[];for(let i=0;i<32;i++){const a=i*Math.PI/16;
    const p=floorCushionPoint(view,s.x,s.y,Math.cos(a)*rx,dy+Math.sin(a)*ry);
    points.push(p.x,p.y);
   }return points;};
   mats.poly(ellipse(31,15,3)).fill({color:0x160b06,alpha:.35});
   mats.poly(ellipse(29,14)).fill(0x67271c).stroke({color:0xb48b51,width:1});
   mats.poly(ellipse(25,10,-2)).fill(0x964332);
   mats.poly(ellipse(23,6,-4)).fill({color:0xc07550,alpha:.25});
  }
 }
 root.visible=false;return {root,update,debug:()=>{
  const data=mainPlane.mesh.geometry.getBuffer('aPosition').data as Float32Array;
  const edge=(column:number)=>Array.from({length:mainPlane.ny},(_,j)=>{const k=(j*mainPlane.nx+column)*2;return {x:data[k],y:data[k+1]};});
  return {visible:root.visible,view:previous.split(':')[0],seats:Number(previous.split(':')[1]),woodOverlay:false,originalFloor:previous.split(':')[0]==='front',projectedRugs:previous.split(':')[0]!=='front',meshCount:planes.length,
   carpet:{textureMode:'original-band-seamless',prayerPanels:patches.filter(p=>p.kind==='prayer').length,leftEdge:edge(0),rightEdge:edge(mainPlane.nx-1),crossingStrips:patches.filter(p=>p.kind!=='aisle'&&p.x<carpetV2.right&&p.x+p.width>carpetV2.left).length}};
 }};
}
