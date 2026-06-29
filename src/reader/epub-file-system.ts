import type { FileSystem } from '@epubjs-react-native/expo-file-system';
import {
  cacheDirectory,
  createDownloadResumable,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { useCallback, useState } from 'react';

/**
 * epub.js-react-native ships an `expo-file-system` adapter, but it imports the
 * pre-SDK-54 module API (`documentDirectory`, `createDownloadResumable`, ...)
 * which SDK 56 moved to `expo-file-system/legacy`. This hook is that adapter,
 * re-pointed at the legacy entry, so the engine swap stays a one-directory
 * change and screens never see it. Behaviour matches the upstream hook.
 */
export function useEpubFileSystem(): FileSystem {
  const [file, setFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [size, setSize] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const downloadFile = useCallback(async (fromUrl: string, toFile: string) => {
    const resumable = createDownloadResumable(
      fromUrl,
      (documentDirectory ?? '') + toFile,
      { cache: true },
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        setProgress(Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100));
      },
    );

    setDownloading(true);
    try {
      const value = await resumable.downloadAsync();
      if (!value) throw new Error('Download failed');
      if (value.headers['Content-Length']) setSize(Number(value.headers['Content-Length']));
      setSuccess(true);
      setError(null);
      setFile(value.uri);
      return { uri: value.uri, mimeType: value.mimeType };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error downloading file');
      return { uri: null, mimeType: null };
    } finally {
      setDownloading(false);
    }
  }, []);

  const getFileInfo = useCallback(async (fileUri: string) => {
    const info = await getInfoAsync(fileUri);
    return {
      uri: info.uri,
      exists: info.exists,
      isDirectory: info.exists ? info.isDirectory : false,
      size: info.exists ? info.size : undefined,
    };
  }, []);

  return {
    file,
    progress,
    downloading,
    size,
    error,
    success,
    documentDirectory,
    cacheDirectory,
    bundleDirectory: undefined,
    readAsStringAsync,
    writeAsStringAsync,
    deleteAsync,
    downloadFile,
    getFileInfo,
  };
}
