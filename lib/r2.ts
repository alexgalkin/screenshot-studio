/**
 * Same-origin paths for stock images.
 *
 * Files live under public/media/ (copied from vendor/media/ at build time)
 * and are served as /media/<bucket key>.
 */

export function getR2PublicUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `/media/${cleanPath}`;
}

export function getR2ImageUrl(options: {
  src: string;
  width?: number;
  height?: number;
  quality?: number | "auto";
  format?: "auto" | "webp" | "avif" | "jpg" | "png";
}): string {
  const { src } = options;

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return src;
  }

  if (src.startsWith("/media/") || src.startsWith("/")) {
    return src.startsWith("/media/") ? src : getR2PublicUrl(src);
  }

  return getR2PublicUrl(src);
}
