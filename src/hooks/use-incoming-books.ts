import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { useLibraryStore } from '@/store/library-store';

/**
 * Imports books handed to the app via iOS "Open in Lesa" / the share sheet.
 *
 * Handles both cold start (the app was launched by opening a file) and warm
 * hand-off (a file opened while the app was already running). Non-file URLs are
 * ignored by the import path.
 */
export function useIncomingBooks(): void {
  const importUri = useLibraryStore((s) => s.importUri);

  useEffect(() => {
    let active = true;

    Linking.getInitialURL().then((url) => {
      if (active && url) void importUri(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url) void importUri(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [importUri]);
}
