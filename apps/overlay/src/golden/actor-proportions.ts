/** Match head width across poses; standing remains naturally taller than sitting. */
export function poseTextureScale(height:number, headWidth:number, referenceHeadWidth:number, seatedHeadWidth:number) {
  return referenceHeadWidth / Math.max(1,headWidth || seatedHeadWidth || height * .22);
}
export function visiblePoseHeight(standing:number,seated:number,bowed:number,standAlpha:number,seatAlpha:number,bowAlpha:number){
  const sum=standAlpha+seatAlpha+bowAlpha;
  return sum>0?(standing*standAlpha+seated*seatAlpha+bowed*bowAlpha)/sum:seated;
}
