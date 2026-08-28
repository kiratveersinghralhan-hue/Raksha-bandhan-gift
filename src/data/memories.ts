export interface Memory {
  id: string;
  image: string;
  year?: string;
  title: string;
  caption: string;
  aspect: number;
  audio?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const memories: Memory[] = [
  {
    id: 'sibling-celebration',
    image: 'media/memories/sibling-celebration.webp',
    title: 'ALWAYS ON YOUR SIDE',
    caption: 'Through every celebration, every argument, and every version of us — still your brother, still right here.',
    aspect: 0.5625,
    position: [-2.05, 0.35, -1],
    rotation: [0, 0.17, -0.025],
  },
  {
    id: 'family-cake',
    image: 'media/memories/family-cake.webp',
    title: 'THE FAMILY TABLE',
    caption: 'The cake, the noise, the teasing, and the people who would save your seat without being asked.',
    aspect: 1.7667,
    position: [0.05, -0.65, -1.55],
    rotation: [0, -0.035, 0.018],
  },
  {
    id: 'lehenga-black-car',
    image: 'media/memories/lehenga-black-car.webp',
    title: 'LOOK HOW FAR YOU HAVE COME',
    caption: 'Somewhere between home and the life you built, you became even more yourself. We are very proud of you.',
    aspect: 0.75,
    position: [2.15, 0.3, -2.05],
    rotation: [0, -0.18, 0.02],
  },
];
