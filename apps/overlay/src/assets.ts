// Original procedural artwork. No video frame, remote asset, font, or third-party illustration.
export const assetManifest = { background: 'procedural:lotus-temple-v1', actors: 'procedural:pilgrims-8-palettes-4-hair', license: 'Original artwork for Vườn Sen An Lành; editable with this application' };
export const robeColors = [0x75948a, 0xc59b67, 0x9d808c, 0x8497ae, 0xb2785d, 0x9ba66f, 0xc6b9a0, 0x6c8c79];

export function templeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
  const c = canvas.getContext('2d')!;
  function path(points: number[], fill: string, stroke?: string, width = 2) {
    c.beginPath(); c.moveTo(points[0], points[1]); for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i+1]); c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  }
  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) { c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2); c.fillStyle = fill; c.fill(); }
  function line(x: number,y: number,x2: number,y2: number,color: string,width=2) { c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke(); }
  const sky = c.createLinearGradient(0,0,0,1920); sky.addColorStop(0,'#163b36');sky.addColorStop(.37,'#617464');sky.addColorStop(.55,'#8c9278');sky.addColorStop(1,'#284d43');c.fillStyle=sky;c.fillRect(0,0,1080,1920);
  const moon = c.createRadialGradient(540,290,5,540,290,480);moon.addColorStop(0,'#e0cf9744');moon.addColorStop(1,'#e0cf9700');c.fillStyle=moon;c.fillRect(0,0,1080,800);
  // Distant cloud bands and mountain silhouettes.
  path([0,450,140,315,280,460,400,320,590,450,730,300,890,395,1080,320,1080,850,0,850],'#406454');
  path([0,610,180,430,330,555,480,420,690,575,830,405,1080,520,1080,900,0,900],'#527260');
  for (let i=0;i<12;i++) { c.globalAlpha=.025; ellipse((i*193)%1080,280+(i%4)*80,220,15,'#fff3cd'); } c.globalAlpha=1;
  // Garden trees, all deterministic.
  for (const side of [0,1]) {
    const x=side?1035:45; c.strokeStyle='#354b37';c.lineWidth=18;c.beginPath();c.moveTo(x,980);c.bezierCurveTo(x+(side?-20:20),650,x+(side?35:-35),400,x,240);c.stroke();
    for(let i=0;i<20;i++){const y=280+i*28,ox=Math.sin(i*2.7)*75;ellipse(x+ox,y,75+(i%3)*15,27,['#2a5040','#345b46','#43694e'][i%3]);}
  }
  // Stone platform and central staircase.
  path([158,690,922,690,1080,1095,0,1095],'#7a816a');
  for(let i=0;i<7;i++){const y=795+i*28,w=365+i*33;c.fillStyle=i%2?'#91917a':'#b3aa86';c.fillRect(540-w,y,w*2,24);line(540-w,y,540+w,y,'#ded1a777',3);}
  // Temple interior, wooden columns and roof.
  const interior=c.createLinearGradient(0,390,0,805);interior.addColorStop(0,'#332c25');interior.addColorStop(1,'#705740');c.fillStyle=interior;c.fillRect(215,375,650,430);
  for(let x=235;x<850;x+=32){c.fillStyle='#ac895522';c.fillRect(x,395,3,360);}
  c.fillStyle='#332c23';c.fillRect(225,760,630,42);
  for(const x of [220,326,732,838]){const wood=c.createLinearGradient(x,0,x+30,0);wood.addColorStop(0,'#624a31');wood.addColorStop(.4,'#a17b49');wood.addColorStop(1,'#57402d');c.fillStyle=wood;c.fillRect(x,398,30,390);c.fillStyle='#d2ad67';c.fillRect(x-6,420,42,9);c.fillRect(x-6,750,42,12);}
  path([105,410,195,370,326,263,754,263,885,370,975,410,879,432,201,432],'#354f42','#c4aa6e',5);
  path([132,399,260,348,350,245,730,245,820,348,948,399,836,387,540,309,244,387],'#476452','#d5b97b',4);
  for(let i=0;i<17;i++){const x=285+i*32;line(540+(x-540)*.7,274,x,370,'#b7ab7144',2);}
  path([268,291,370,250,446,202,634,202,710,250,812,291,720,301,540,246,360,301],'#355448','#d2b67a',4);
  // Upturned roof ends and quiet crest.
  for(const side of [-1,1]){c.beginPath();c.moveTo(540+side*390,390);c.quadraticCurveTo(540+side*466,400,540+side*482,351);c.strokeStyle='#cdb276';c.lineWidth=8;c.stroke();}
  ellipse(540,219,13,18,'#d0b77d');
  c.fillStyle='#775b3a';c.fillRect(425,378,230,58);c.strokeStyle='#c2a263';c.lineWidth=2;c.strokeRect(432,385,216,44);c.fillStyle='#e4ce8e';c.font='20px Georgia';c.textAlign='center';c.fillText('TĨNH TÂM',540,415);
  // Golden halo and original stylized seated Buddha, respectful unobstructed center.
  const glow=c.createRadialGradient(540,561,30,540,561,160);glow.addColorStop(0,'#f6d48688');glow.addColorStop(.65,'#e5c27833');glow.addColorStop(1,'#e5c27800');c.fillStyle=glow;c.fillRect(365,405,350,340);
  c.beginPath();c.arc(540,560,107,0,Math.PI*2);c.strokeStyle='#dfbf754d';c.lineWidth=2;c.stroke();c.beginPath();c.arc(540,560,94,0,Math.PI*2);c.stroke();
  const gold=c.createLinearGradient(445,0,630,0);gold.addColorStop(0,'#ae8141');gold.addColorStop(.45,'#e9c778');gold.addColorStop(1,'#bf9650');
  c.fillStyle=gold;c.beginPath();c.moveTo(506,588);c.bezierCurveTo(476,600,469,652,451,682);c.quadraticCurveTo(420,715,478,721);c.lineTo(601,721);c.quadraticCurveTo(660,716,629,685);c.bezierCurveTo(607,659,609,605,574,588);c.closePath();c.fill();
  ellipse(540,558,37,47,'#e2bd6c');ellipse(503,564,6,17,'#c7a054');ellipse(577,564,6,17,'#c7a054');
  ellipse(540,524,37,23,'#6c6240');ellipse(540,502,13,18,'#77704b');
  c.strokeStyle='#856a3c';c.lineWidth=2;c.beginPath();c.moveTo(518,560);c.quadraticCurveTo(525,565,532,560);c.moveTo(548,560);c.quadraticCurveTo(555,565,562,560);c.stroke();c.beginPath();c.moveTo(533,579);c.quadraticCurveTo(540,583,547,579);c.stroke();
  c.strokeStyle='#a67c3d';c.lineWidth=3;c.beginPath();c.moveTo(572,595);c.quadraticCurveTo(546,638,507,684);c.moveTo(494,623);c.quadraticCurveTo(489,657,524,671);c.moveTo(588,623);c.quadraticCurveTo(594,655,555,670);c.stroke();ellipse(540,673,25,9,'#efd28b');
  for(let i=0;i<9;i++){c.save();c.translate(540+(i-4)*19,731);c.rotate((i-4)*.15);ellipse(0,0,15,23,i%2?'#b28b49':'#d5af62');c.restore();}ellipse(540,751,112,12,'#886838');
  // Lanterns and altar flowers.
  for(const x of [178,371,709,902]){const y=x<200||x>880?480:463;line(x,405,x,y,'#a68c5b',3);const lg=c.createRadialGradient(x,y+35,5,x,y+35,68);lg.addColorStop(0,'#ffcf7955');lg.addColorStop(1,'#ffcf7900');c.fillStyle=lg;c.fillRect(x-75,y-30,150,150);ellipse(x,y+30,25,39,'#ce9d54');ellipse(x,y+30,19,35,'#edc679');line(x,y+67,x,y+93,'#d3a85c',3);c.fillStyle='#7a5b38';c.fillRect(x-19,y-4,38,7);c.fillRect(x-18,y+62,36,6);}
  for(const x of [392,688]){for(let i=0;i<5;i++){line(x,770,x+(i-2)*12,713+(i%2)*12,'#7b8b53',3);ellipse(x+(i-2)*12,713+(i%2)*12,10,13,'#ddbd9a');}path([x-18,748,x+18,748,x+13,780,x-13,780],'#577a64','#c4b578');}
  // Courtyard and perspective tiles, with a clear aisle.
  path([0,1070,1080,1070,1080,1920,0,1920],'#647763');
  for(let row=0;row<14;row++){const y=1070+row*65;line(0,y,1080,y,'#a3aa8740',2);}
  for(let col=-5;col<=5;col++)line(540+col*73,1070,540+col*163,1920,'#b4b28d33',2);
  path([453,1040,627,1040,687,1920,393,1920],'#a69d78','#d0be8b',3);
  path([466,1040,614,1040,669,1920,411,1920],'#849080');
  for(let i=0;i<11;i++){const y=1100+i*76;ellipse(540,y,13+i*.4,5,'#c8ba8a66');}
  // Lotus pools and stone rims.
  for(const x of [148,932]){ellipse(x,995,165,82,'#b4ab83');ellipse(x,990,151,66,'#315b51');ellipse(x,980,136,49,'#447369');for(let i=0;i<7;i++){const lx=x-110+(i*43)%220,ly=965+(i%3)*20;ellipse(lx,ly,23,9,'#769775');line(lx-15,ly,lx+12,ly,'#b6b88c55',1);if(i%2===0){for(let j=-2;j<=2;j++){c.save();c.translate(lx+j*5,ly-6);c.rotate(j*.45);ellipse(0,0,5,12,j%2?'#d2a6a0':'#ead1b3');c.restore();}}}}
  // Incense vessel.
  ellipse(540,1007,110,22,'#354f4055');path([464,921,616,921,602,987,478,987],'#9b7e4a','#d7bb79',3);ellipse(540,921,76,15,'#d9be7f');ellipse(540,922,62,10,'#635137');
  for(const x of [490,590]){path([x-7,982,x+7,982,x+12,1007,x-12,1007],'#9b7e4a');}
  for(const side of [-1,1]){c.beginPath();c.ellipse(540+side*83,944,18,21,0,0,Math.PI*2);c.strokeStyle='#b99b60';c.lineWidth=8;c.stroke();}
  for(const x of [522,540,558]){line(x,925,x,867-(x===540?15:0),'#9e5439',3);ellipse(x,867-(x===540?15:0),3,3,'#f6ba72');}
  ellipse(540,957,15,16,'#d2b276');c.fillStyle='#857342';c.font='20px Georgia';c.fillText('心',540,964);
  // Side garden border and foreground gateposts.
  for(const side of [0,1]){const x=side?1057:23;for(let i=0;i<12;i++){ellipse(x+(side?-1:1)*(i%3)*9,1130+i*71,24,31,['#315c46','#3d674b','#587a50'][i%3]);}}
  for(const x of [326,754]){c.fillStyle='#59705b';c.fillRect(x-20,1802,40,118);c.fillStyle='#b4aa7f';c.fillRect(x-28,1800,56,15);ellipse(x,1795,22,15,'#8c9974');}
  const vignette=c.createRadialGradient(540,980,440,540,980,1250);vignette.addColorStop(0,'#102c2300');vignette.addColorStop(1,'#102c2388');c.fillStyle=vignette;c.fillRect(0,0,1080,1920);
  return canvas;
}
