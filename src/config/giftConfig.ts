import { publicAssetUrl } from '../utils/publicAssetUrl';

export const giftConfig = {
  sisterName: 'Harsamreet',
  sisterNickname: 'Motti',
  brotherName: 'Kiratveer Singh Ralhan',
  occasion: 'Raksha Bandhan',
  greeting: 'Happy Raksha Bandhan',
  from: 'India',
  to: 'Canada',
  distance: '11,000+ KM',
  backgroundTrack: null as string | null,
  film: publicAssetUrl('media/sister-film.mp4') as string | null,
  filmPoster: publicAssetUrl('media/memories/sibling-celebration.webp') as string | null,
} as const;
