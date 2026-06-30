import { PdfView } from '@kishannareshpal/expo-pdf';
import { useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Spacing } from '@/constants/theme';
import type { PdfFit } from '@/store/settings-store';

import { parsePdfPosition, serializePdfPosition } from './pdf-position';
import type { ReaderViewProps } from './types';

export interface PdfReaderProps extends ReaderViewProps {
  /** Page-snap vs free scroll. EPUB has no equivalent. */
  paging?: boolean;
  /** How the page scales to the viewport (PDF's only "zoom"). */
  fit?: PdfFit;
}

/**
 * PDF engine implementation of the {@link ReaderView} contract, backed by
 * `@kishannareshpal/expo-pdf` (Apple PDFKit). Vertical continuous scrolling is
 * the primary mode. This file is the ONLY place that touches the PDF library;
 * screens depend solely on {@link ReaderViewProps}.
 *
 * Text selection (long-press → native iOS Copy / Look Up / Share menu) is
 * provided for free by PDFKit's `PDFView`, which has selection enabled by
 * default; the wrapper does nothing to suppress it, so no prop or patch is
 * needed here. This is transient OS selection only — persistent highlights are
 * a later phase. Note: only PDFs with a real text layer are selectable;
 * scanned/image-only PDFs have no text and cannot be selected (an inherent
 * PDFKit limitation).
 *
 * Persistent highlights (Phase 15) are NOT supported by this engine:
 * `@kishannareshpal/expo-pdf` 0.3.2 exposes no selection callback, annotation
 * creation, or restore API in JS or its native Swift module (only props +
 * load/page/error events). The engine-neutral highlight props
 * (`highlights`, `onSelectionForHighlight`, `onPressHighlight`, `jumpTarget`)
 * are therefore accepted but ignored here — graceful degradation, the same
 * pattern as PDF covers (Phase 7) and PDF selection limits (Phase 14). PDF
 * highlights remain a documented follow-up needing a native PDFKit patch.
 */
export function PdfReader({
  absolutePath,
  initialPosition,
  theme,
  paging = false,
  fit = 'width',
  onPositionChange,
  onProgress,
  onTap,
  onReady,
}: PdfReaderProps) {
  const initialPage = useMemo(() => parsePdfPosition(initialPosition)?.page, [initialPosition]);

  // Ignore page events until the document has loaded so the initial page-0 layout
  // can't overwrite a saved position before the restore jump lands.
  const loadedRef = useRef(false);

  // A deliberate tap toggles the chrome; a scroll must not. The tap recogniser
  // fails once the finger travels past maxDistance, so scrolls fall through to
  // PDFKit instead of flashing the controls. (PDFKit exposes no tap callback of
  // its own, unlike the EPUB engine.)
  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(10)
        .onEnd(() => onTap?.())
        .runOnJS(true),
    [onTap],
  );

  return (
    <GestureDetector gesture={tapGesture}>
      <PdfView
        style={[styles.container, { backgroundColor: theme.background }]}
        uri={absolutePath}
        initialPage={initialPage}
        fitMode={fit}
        pagingEnabled={paging}
        pageGap={Spacing.two}
        pageColorInverted={theme.isDark}
        onPageChanged={({ pageIndex, pageCount }) => {
          if (!loadedRef.current) return;
          if (__DEV__) console.log('[PdfReader] page changed -> saving page', pageIndex);
          onPositionChange(serializePdfPosition({ page: pageIndex }));
          onProgress?.({ page: pageIndex + 1, pageCount });
        }}
        onLoadComplete={({ pageCount }) => {
          loadedRef.current = true;
          if (__DEV__) {
            console.log(
              '[PdfReader] document loaded; restoring to page',
              initialPage ?? '(none saved)',
            );
          }
          onProgress?.({ page: (initialPage ?? 0) + 1, pageCount });
          onReady?.();
        }}
        onError={({ code, message }) => {
          console.warn(`[PdfReader] failed to render PDF (${code}): ${message}`);
        }}
      />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
