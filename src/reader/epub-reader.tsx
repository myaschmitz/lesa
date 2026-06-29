import { Reader, ReaderProvider, useReader, type Theme } from '@epubjs-react-native/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { fontSizeToCss } from '@/theme/typography';

import { useEpubFileSystem } from './epub-file-system';
import { parseEpubPosition, serializeEpubPosition } from './epub-position';
import type { ReaderTheme, ReaderTypography, ReaderViewProps } from './types';

/**
 * EPUB engine implementation of the {@link ReaderView} contract, backed by
 * epub.js inside a WebView (`@epubjs-react-native/core`). Continuous vertical
 * scrolling is the primary mode. This file is the ONLY place that touches the
 * EPUB library; screens depend solely on {@link ReaderViewProps}. Position is an
 * opaque epub.js CFI, never unified with the PDF page+offset token.
 */
export function EpubReader(props: ReaderViewProps) {
  return (
    <ReaderProvider>
      <EpubReaderInner {...props} />
    </ReaderProvider>
  );
}

function EpubReaderInner({
  absolutePath,
  initialPosition,
  theme,
  typography,
  onPositionChange,
  onProgress,
  onCoverExtracted,
  onReady,
}: ReaderViewProps) {
  const { width, height } = useWindowDimensions();
  const { goToLocation, changeFontSize, changeFontFamily, changeTheme, getMeta } = useReader();
  const [tocVisible, setTocVisible] = useState(false);

  const initialCfi = useMemo(() => parseEpubPosition(initialPosition)?.cfi, [initialPosition]);
  // Frozen at mount: epub.js re-renders the WebView (and scrolls to the top) when
  // `defaultTheme` changes, so it only seeds the first paint. Live updates go
  // through changeTheme/changeFont* below.
  const [initialTheme] = useState(() => epubTheme(theme, typography));

  // Ignore location events until ready so the initial layout can't clobber a
  // saved CFI before the restore jump lands.
  const readyRef = useRef(false);
  // Latest known reading position, used to re-anchor after a reflow.
  const lastCfiRef = useRef<string | undefined>(initialCfi);
  // The cover is delivered once via a `meta` message after the book parses
  // (epub.js posts it asynchronously, after onReady), so emit it a single time.
  const coverEmittedRef = useRef(false);

  // Best-effort cover extraction. epub.js delivers the cover as a base64 data URL
  // asynchronously (after onReady) via the reader context's metadata. `getMeta`'s
  // identity changes when that metadata updates, so this effect re-runs and picks
  // the cover up once. Surface it so the library can persist a thumbnail; the
  // reader stays unaware of where covers are stored.
  useEffect(() => {
    if (coverEmittedRef.current || !onCoverExtracted) return;
    const cover = getMeta()?.cover;
    if (typeof cover === 'string' && cover.startsWith('data:')) {
      coverEmittedRef.current = true;
      onCoverExtracted(cover);
    }
  }, [getMeta, onCoverExtracted]);

  // Live theme/typography. A continuous-flow reflow scrolls to the top, so jump
  // back to the current location once it settles to kill the first-page flash.
  useEffect(() => {
    if (!readyRef.current) return;
    changeTheme(epubTheme(theme, typography));
    if (typography) {
      changeFontSize(fontSizeToCss(typography.fontSize));
      changeFontFamily(typography.fontFamily);
    }
    const cfi = lastCfiRef.current;
    if (cfi) {
      const t = setTimeout(() => goToLocation(cfi), 80);
      return () => clearTimeout(t);
    }
  }, [
    theme,
    typography?.fontFamily,
    typography?.fontSize,
    typography?.lineHeight,
    changeTheme,
    changeFontSize,
    changeFontFamily,
    goToLocation,
    typography,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Reader
        src={absolutePath}
        fileSystem={useEpubFileSystem}
        width={width}
        height={height}
        flow="scrolled-continuous"
        manager="continuous"
        initialLocation={initialCfi}
        defaultTheme={initialTheme}
        onReady={() => {
          readyRef.current = true;
          // Apply persisted typography once the book is laid out.
          if (typography) {
            changeFontSize(fontSizeToCss(typography.fontSize));
            changeFontFamily(typography.fontFamily);
          }
          // Re-anchor after the continuous layout has settled. `initialLocation`
          // jumps before sections finish measuring, which lands ~half a page off;
          // a second jump once ready snaps back to the exact saved CFI. Keep the
          // loading overlay up (delay onReady) until the jump lands so the user
          // doesn't see the cover flash past.
          if (initialCfi) {
            setTimeout(() => {
              goToLocation(initialCfi);
              setTimeout(() => onReady?.(), 150);
            }, 250);
          } else {
            onReady?.();
          }
        }}
        onLocationChange={(_total, location) => {
          if (!readyRef.current) return;
          const cfi = location?.start?.cfi;
          if (cfi) {
            lastCfiRef.current = cfi;
            onPositionChange(serializeEpubPosition({ cfi }));
          }
          // Best-effort, display-only progress for the page indicator. epub.js is
          // reflowable so there's no fixed page count; the locator percentage is
          // the closest honest signal. Shown as "X%".
          const fraction = location?.start?.percentage;
          if (typeof fraction === 'number') onProgress?.({ fraction });
        }}
        onDisplayError={(message) => {
          console.warn(`[EpubReader] failed to render EPUB: ${message}`);
        }}
      />

      <ContentsButton theme={theme} onPress={() => setTocVisible(true)} />
      <ContentsModal theme={theme} visible={tocVisible} onClose={() => setTocVisible(false)} />
    </View>
  );
}

function ContentsButton({ theme, onPress }: { theme: ReaderTheme; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Chapters"
      onPress={onPress}
      style={[styles.tocButton, { backgroundColor: theme.backgroundElement }]}
    >
      <Text style={{ color: theme.text }}>Chapters</Text>
    </Pressable>
  );
}

function ContentsModal({
  theme,
  visible,
  onClose,
}: {
  theme: ReaderTheme;
  visible: boolean;
  onClose: () => void;
}) {
  const { toc, goToLocation } = useReader();

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={[styles.modal, { backgroundColor: theme.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Chapters</Text>
          <Pressable onPress={onClose} accessibilityLabel="Close chapters">
            <Text style={{ color: theme.text }}>Done</Text>
          </Pressable>
        </View>
        <ScrollView>
          {toc.map((section) => (
            <Pressable
              key={section.id}
              style={styles.tocRow}
              onPress={() => {
                // Jump while the WebView is still mounted, then close. Closing
                // first and jumping after the slide-out can drop the call.
                goToLocation(section.href);
                onClose();
              }}
            >
              <Text style={{ color: theme.text }}>{section.label.trim() || 'Untitled'}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Maps shared {@link ReaderTheme} tokens onto epub.js's CSS-selector theme. */
function epubTheme(theme: ReaderTheme, typography?: ReaderTypography): Theme {
  const lineHeight = typography ? String(typography.lineHeight) : undefined;
  return {
    body: {
      background: theme.background,
      color: theme.text,
      ...(lineHeight ? { 'line-height': lineHeight } : {}),
    },
    p: { color: theme.text, ...(lineHeight ? { 'line-height': lineHeight } : {}) },
    a: { color: theme.text },
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tocButton: {
    position: 'absolute',
    bottom: Spacing.four,
    left: Spacing.four,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  modal: {
    flex: 1,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.three,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  tocRow: {
    paddingVertical: Spacing.three,
  },
});
