import { filmClips, backgroundMusic } from '../data/filmClips';
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
  backgroundTrack: backgroundMusic,
  film: filmClips[0]?.src ?? publicAssetUrl('media/sister-film.mp4'),
  filmPoster: filmClips[0]?.poster ?? publicAssetUrl('media/memories/sibling-celebration.webp'),
} as const;
