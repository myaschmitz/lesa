import { useEffect } from 'react';

import { setIncomingBookListener } from '@/library/incoming-queue';
import { useLibraryStore } from '@/store/library-store';

/**
 * Imports books handed to the app via iOS "Open in Lesa" / the share sheet.
 *
 * The inbound `file://` URLs are captured by `app/+native-intent.tsx` (so Expo
 * Router never tries to route them) and buffered in the incoming queue. This
 * hook drains that queue, covering both cold start (file buffered before mount)
 * and warm hand-off (file opened while the app is already running).
 */
export function useIncomingBooks(): void {
  const importUri = useLibraryStore((s) => s.importUri);

  useEffect(() => {
    return setIncomingBookListener((uri) => {
      void importUri(uri);
    });
  }, [importUri]);
}
