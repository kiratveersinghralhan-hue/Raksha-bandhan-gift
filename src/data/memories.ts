import manifest from '../../media-manifest.json';

export interface Memory {
  id: string;
  image: string;
  title: string;
  caption: string;
  aspect: number;
}

const aspects = [
  0.562219,
  0.75,
  0.5375,
  1.777778,
  0.75,
  1.333333,
  1.333333,
  0.75,
  0.75,
  0.75,
  0.562219,
  0.562219,
  0.562219,
] as const;

export const memories: Memory[] = manifest.memories.map((memory, index) => ({
  id: String(memory.id),
  image: memory.image,
  title: memory.title,
  caption: memory.caption,
  aspect: aspects[index],
}));
