import { File } from 'expo-file-system';

import { importLog } from '@/library/debug';
import { inferFormat, type ImportCandidate } from '@/library/import';

/**
 * Builds an import candidate from an inbound `file://` URL (an iOS "Open in
 * Lesa" / share-sheet hand-off). Returns null if the URL is not a readable,
 * supported book file.
 */
export function candidateFromUri(uri: string): ImportCandidate | null {
  if (!uri.startsWith('file://')) {
    importLog('candidateFromUri: not a file:// uri', uri);
    return null;
  }

  let file: File;
  try {
    file = new File(uri);
  } catch (error) {
    importLog('candidateFromUri: new File() threw', { uri, error });
    return null;
  }

  const exists = file.exists;
  importLog('candidateFromUri: file info', {
    uri,
    name: file.name,
    exists,
    size: file.size,
  });
  if (!exists) {
    importLog('candidateFromUri: file does not exist (security-scoped?)', uri);
    return null;
  }

  const format = inferFormat(file.name);
  if (!format) {
    importLog('candidateFromUri: unsupported format for name', file.name);
    return null;
  }

  return {
    uri,
    name: file.name,
    sizeBytes: file.size ?? 0,
    format,
  };
}
