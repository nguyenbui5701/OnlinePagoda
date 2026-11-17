import {Rectangle,Sprite,Texture} from 'pixi.js';
import type {FlowerStyle} from '@vuonsen/shared';
type Kind=FlowerStyle|'leaf-green'|'leaf-gold';
type Tile=Kind|`${FlowerStyle}-petal`;
const kinds:Kind[]=['pink','ivory','gold','peach','leaf-green','leaf-gold'];
let textures:Partial<Record<Tile,Texture>>|undefined;
/** One cached native canvas atlas. All particles share a GPU source, no per-frame drawing/filters. */
function atlas(){
 if(textures)return textures;
 const canvas=document.createElement('canvas');canvas.width=128*kinds.length;canvas.height=256;
 const c=canvas.getContext('2d')!;textures={};
 for(const [index,kind] of kinds.entries()){
  c.save();c.translate(index*128+64,64);
  if(kind.startsWith('leaf')){
   const grad=c.createLinearGradient(-38,-42,36,45);grad.addColorStop(0,kind==='leaf-green'?'#d9e9a5':'#fff0b3');grad.addColorStop(.48,kind==='leaf-green'?'#7d9f40':'#e8af38');grad.addColorStop(1,kind==='leaf-green'?'#38592a':'#a26319');
   c.beginPath();c.moveTo(0,56);c.bezierCurveTo(-5,30,-52,9,-38,-20);c.bezierCurveTo(-24,-49,-6,-39,0,-30);c.bezierCurveTo(6,-39,24,-49,38,-20);c.bezierCurveTo(52,9,5,30,0,56);c.fillStyle=grad;c.fill();c.strokeStyle='#e4d99a';c.lineWidth=1.4;c.stroke();
   c.beginPath();c.moveTo(0,-32);c.lineTo(0,52);for(let j=-18;j<=28;j+=12){c.moveTo(0,j+12);c.quadraticCurveTo(15,j+2,27-Math.abs(j)*.4,j-7);c.moveTo(0,j+12);c.quadraticCurveTo(-15,j+2,-27+Math.abs(j)*.4,j-7);}c.strokeStyle='rgba(255,245,190,.55)';c.lineWidth=1.2;c.stroke();
  }else{
   const palette={pink:['#fff2db','#ffa6ce','#c84480'],ivory:['#fffef4','#ffeac4','#c6a25c'],gold:['#fff5c5','#ffda69','#d69026'],peach:['#fff0dc','#ffb8c0','#de6880']}[kind as FlowerStyle];
   const lotus=kind==='pink'||kind==='ivory';
   for(const ring of [0,1])for(let i=0;i<(lotus?9:5);i++){
    c.save();c.rotate(i*Math.PI*2/(lotus?9:5)+ring*.34);c.scale(ring?.72:1,ring?.72:1);
    const grad=c.createLinearGradient(0,-52,0,10);grad.addColorStop(0,palette[0]);grad.addColorStop(.4,palette[1]);grad.addColorStop(1,palette[2]);
    c.beginPath();c.moveTo(0,10);c.bezierCurveTo(-29,-5,-28,-35,0,-53);c.bezierCurveTo(28,-35,29,-5,0,10);c.fillStyle=grad;c.fill();c.strokeStyle='rgba(255,244,200,.75)';c.lineWidth=1.4;c.stroke();
    c.beginPath();c.moveTo(0,3);c.quadraticCurveTo(-5,-20,0,-45);c.strokeStyle='rgba(255,246,211,.5)';c.lineWidth=1;c.stroke();c.restore();
   }
   c.beginPath();c.arc(0,0,10,0,Math.PI*2);c.fillStyle='#ffdf76';c.fill();for(let i=0;i<13;i++){const a=i*2.4,r=Math.sqrt(i)*2;c.beginPath();c.arc(Math.cos(a)*r,Math.sin(a)*r,1.5,0,7);c.fillStyle=i%2?'#fff8cf':'#b68632';c.fill();}
   c.translate(0,128);
   const petal=c.createLinearGradient(-15,-46,20,46);petal.addColorStop(0,palette[0]);petal.addColorStop(.45,palette[1]);petal.addColorStop(1,palette[2]);
   c.beginPath();c.moveTo(0,-50);c.bezierCurveTo(-43,-19,-30,30,12,48);c.bezierCurveTo(39,17,37,-23,0,-50);c.fillStyle=petal;c.fill();c.strokeStyle='rgba(255,244,209,.8)';c.lineWidth=2;c.stroke();
   c.beginPath();c.moveTo(0,-42);c.quadraticCurveTo(-12,4,11,41);c.strokeStyle='rgba(255,250,227,.65)';c.lineWidth=1.4;c.stroke();
  }
  c.restore();
 }
 const base=Texture.from(canvas);
 for(const [i,kind] of kinds.entries())textures[kind]=new Texture({source:base.source,frame:new Rectangle(i*128,0,128,128)});
 for(const [i,kind] of kinds.slice(0,4).entries())textures[`${kind as FlowerStyle}-petal`]=new Texture({source:base.source,frame:new Rectangle(i*128,128,128,128)});
 return textures;
}
export function petalTexture(kind:Tile){return atlas()[kind]!;}
export function petalSprite(kind:Kind){const sprite=new Sprite(petalTexture(kind));sprite.anchor.set(.5);return sprite;}
