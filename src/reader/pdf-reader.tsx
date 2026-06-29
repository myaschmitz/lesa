import { PdfView } from '@kishannareshpal/expo-pdf';
import { useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

import { parsePdfPosition, serializePdfPosition } from './pdf-position';
import type { ReaderViewProps } from './types';

/**
 * PDF engine implementation of the {@link ReaderView} contract, backed by
 * `@kishannareshpal/expo-pdf` (Apple PDFKit). Vertical continuous scrolling is
 * the primary mode. This file is the ONLY place that touches the PDF library;
 * screens depend solely on {@link ReaderViewProps}.
 */
export function PdfReader({
  absolutePath,
  initialPosition,
  theme,
  onPositionChange,
  onReady,
}: ReaderViewProps) {
  const initialPage = useMemo(() => parsePdfPosition(initialPosition)?.page, [initialPosition]);

  // Ignore page events until the document has loaded so the initial page-0 layout
  // can't overwrite a saved position before the restore jump lands.
  const loadedRef = useRef(false);

  return (
    <PdfView
      style={[styles.container, { backgroundColor: theme.background }]}
      uri={absolutePath}
      initialPage={initialPage}
      fitMode="width"
      pageGap={Spacing.two}
      pageColorInverted={theme.isDark}
      onPageChanged={({ pageIndex }) => {
        if (!loadedRef.current) return;
        if (__DEV__) console.log('[PdfReader] page changed -> saving page', pageIndex);
        onPositionChange(serializePdfPosition({ page: pageIndex }));
      }}
      onLoadComplete={() => {
        loadedRef.current = true;
        if (__DEV__) {
          console.log(
            '[PdfReader] document loaded; restoring to page',
            initialPage ?? '(none saved)',
          );
        }
        onReady?.();
      }}
      onError={({ code, message }) => {
        console.warn(`[PdfReader] failed to render PDF (${code}): ${message}`);
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
