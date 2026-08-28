const EXTERNAL_URL = /^(?:[a-z][a-z\d+.-]*:)?\/\//i;

/** Resolves files from public/ against Vite's configured deployment base. */
export function publicAssetUrl(path: string): string {
  const value = path.trim();

  if (!value || EXTERNAL_URL.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  const relativePath = value.replace(/^\.?\/+/, '');
  return `${import.meta.env.BASE_URL}${relativePath}`;
}
