export interface Memory {
  id: string;
  image: string;
  year?: string;
  title: string;
  caption: string;
  audio?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

// Replace these placeholders with real memories. Empty image values render an
// elegant frame instead of requesting a missing file.
export const memories: Memory[] = [
  { id: 'memory-01', image: '', title: 'A MEMORY BELONGS HERE', caption: 'Add a photograph and the words only the two of you would understand.', position: [-2.5, 0.8, -0.8], rotation: [0, 0.18, 0] },
  { id: 'memory-02', image: '', title: 'THE BEGINNING OF THE CHAOS', caption: 'A place for the evidence.', position: [0.1, -0.2, -1.4], rotation: [0, -0.08, 0] },
  { id: 'memory-03', image: '', title: 'ONE FOR THE FAMILY ARCHIVE', caption: 'Use a wide photograph here.', position: [2.7, 0.75, -2], rotation: [0, -0.2, 0] },
  { id: 'memory-04', image: '', title: 'A QUIET LITTLE MOMENT', caption: 'Some memories do not need a long caption.', position: [-2.1, -1.55, -2.8], rotation: [0, 0.13, 0] },
  { id: 'memory-05', image: '', title: 'STILL CAUSING TROUBLE', caption: 'Naturally, some things never change.', position: [1.15, -1.75, -3.4], rotation: [0, -0.1, 0] },
];
