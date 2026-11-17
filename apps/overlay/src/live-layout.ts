// Move information above the chat area; do not rescale/crop the scene or side panels.
export const compactCardBounds={x:148,y:1056,width:784,height:184};
export function compactFortuneText(title:string,short:string){
  const prefix=title+' — ';return short.startsWith(prefix)?short.slice(prefix.length):short;
}
