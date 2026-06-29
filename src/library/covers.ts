import { File, Paths } from 'expo-file-system';

import { COVERS_DIR, ensureCoversDir } from '@/library/paths';

/** Maps a cover's MIME type to a file extension; defaults to jpg. */
function extensionForMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'jpg';
}

/**
 * Persists a base64 data-URL cover (as emitted by the EPUB engine's
 * `getMeta().cover`) to `covers/<id>.<ext>` and returns the RELATIVE path.
 *
 * Like book files, covers live on disk under Documents — never in the DB — and
 * only the relative path is stored so it survives container-UUID changes. Returns
 * null on any malformed input so cover extraction can fail silently.
 */
export function saveCoverDataUrl(bookId: string, dataUrl: string): string | null {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) return null;

  const [, mime, base64] = match;
  const ext = extensionForMime(mime);
  const relativePath = `${COVERS_DIR}/${bookId}.${ext}`;

  ensureCoversDir();
  const file = new File(Paths.document, relativePath);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: 'base64' });

  return relativePath;
}
