import { File } from 'expo-file-system';

import { inferFormat, type ImportCandidate } from '@/library/import';

/**
 * Builds an import candidate from an inbound `file://` URL (an iOS "Open in
 * Lesa" / share-sheet hand-off). Returns null if the URL is not a readable,
 * supported book file.
 */
export function candidateFromUri(uri: string): ImportCandidate | null {
  if (!uri.startsWith('file://')) {
    return null;
  }

  let file: File;
  try {
    file = new File(uri);
  } catch {
    return null;
  }

  if (!file.exists) {
    return null;
  }

  const format = inferFormat(file.name);
  if (!format) {
    return null;
  }

  return {
    uri,
    name: file.name,
    sizeBytes: file.size ?? 0,
    format,
  };
}

/**
 * Deletes the temporary copy iOS placed in our sandbox (the share-sheet
 * "Inbox") after we've imported it. Safe to call on any inbound URI; only
 * sandbox files are deletable, and failures are swallowed.
 */
export function cleanupIncomingFile(uri: string): void {
  if (!uri.startsWith('file://')) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Best-effort cleanup; ignore failures.
  }
}
