import { publicAssetUrl } from '../utils/publicAssetUrl';

export const giftConfig = {
  sisterName: 'SISTER_NAME',
  brotherName: 'BROTHER_NAME',
  occasion: 'Raksha Bandhan',
  greeting: 'Happy Raksha Bandhan',
  from: 'India',
  to: 'Canada',
  distance: '11,000+ KM',
  backgroundTrack: publicAssetUrl('media/music/background.mp3'),
  film: publicAssetUrl('media/sister-film.mp4'),
  filmPoster: publicAssetUrl('media/sister-film-poster.webp'),
} as const;
