import {it,expect} from 'vitest';
import {artworkHasAvatar} from '../apps/overlay/src/artwork-diagnostics';

it('accepts unlabeled dragon wrappers and plain lotus without mistaking either for an avatar',()=>{
  expect(artworkHasAvatar({label:null,children:[{label:undefined},{label:'showcase-art:dragon'}]})).toBe(false);
  expect(artworkHasAvatar({label:'lotus:plain',children:[{label:null}]})).toBe(false);
});
it('detects loaded or fallback avatars nested inside an unlabeled composition',()=>{
  for(const label of ['avatar:loaded','avatar:fallback','lotus-portrait:loaded','lotus-portrait:fallback']){
    expect(artworkHasAvatar({label:null,children:[{children:[{label}]}]})).toBe(true);
  }
});
