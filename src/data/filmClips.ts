import manifest from '../../media-manifest.json';
import { publicAssetUrl } from '../utils/publicAssetUrl';

export interface FilmClip {
  id: number;
  src: string;
  poster: string;
  label: string;
}

export const filmClips: FilmClip[] = manifest.filmClips.map((clip) => ({
  ...clip,
  src: publicAssetUrl(clip.src),
  poster: publicAssetUrl(clip.poster),
}));

export const backgroundMusic = publicAssetUrl(manifest.backgroundMusic);
