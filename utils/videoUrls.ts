/** Сортировка URL видео: сначала новые (по timestamp в пути Supabase …/1234567890.mp4). */
export function extractVideoTimestamp(url: string): number {
  const m = url.match(/\/(\d{10,})\.mp4(?:\?|$)/i);
  return m ? Number(m[1]) : 0;
}

export function sortVideoUrlsNewestFirst(urls: string[]): string[] {
  return [...urls].sort((a, b) => extractVideoTimestamp(b) - extractVideoTimestamp(a));
}

/** Превью, загруженное вместе с mp4: …/1234567890_thumb.jpg */
export function getVideoThumbnailUrl(videoUrl: string): string | null {
  if (!/\.mp4(?:\?.*)?$/i.test(videoUrl)) return null;
  return videoUrl.replace(/\.mp4(\?.*)?$/i, '_thumb.jpg$1');
}

export function getVideoThumbStoragePath(videoPath: string): string {
  return videoPath.replace(/\.mp4$/i, '_thumb.jpg');
}
