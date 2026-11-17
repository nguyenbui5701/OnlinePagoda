import {stableSeed} from './gift-show';
export const flowerStyles=['pink','ivory','gold','peach'] as const;
export type FlowerStyle=typeof flowerStyles[number];
export type PetalDensity='low'|'medium'|'high';
export function flowerTheme(session:string,cycle:number,style:FlowerStyle|'auto'):FlowerStyle {
  return style==='auto'?flowerStyles[(stableSeed(session)+cycle)%4]:style;
}
export function particleBudget(density:PetalDensity,reduced:boolean,weather=false){return reduced?(weather?0:18):weather?({low:12,medium:18,high:24}[density]):({low:36,medium:54,high:72}[density]);}
