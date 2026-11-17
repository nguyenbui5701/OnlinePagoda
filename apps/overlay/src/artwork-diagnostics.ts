interface ArtworkNode {label?:string|null;children?:readonly ArtworkNode[]}
/** Inspect descendants too: a plain wrapper can contain an avatar flower. */
export function artworkHasAvatar(node:ArtworkNode):boolean {
  const label=node.label??'';
  return label.startsWith('avatar:')||label.startsWith('lotus-portrait:')||
    (node.children?.some(artworkHasAvatar)??false);
}
