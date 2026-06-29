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
  onReady,
}: ReaderViewProps) {
  const { width, height } = useWindowDimensions();
  const { goToLocation, changeFontSize, changeFontFamily, changeTheme } = useReader();
  const [tocVisible, setTocVisible] = useState(false);

  const initialCfi = useMemo(() => parseEpubPosition(initialPosition)?.cfi, [initialPosition]);
  const defaultTheme = useMemo(() => epubTheme(theme, typography), [theme, typography]);

  // Ignore location events until ready so the initial layout can't clobber a
  // saved CFI before the restore jump lands.
  const readyRef = useRef(false);

  // Re-apply theme + typography live whenever they change. `defaultTheme` only
  // seeds the initial render; an open book needs changeTheme/changeFont* to pick
  // up new colours, line-height, family, or size.
  useEffect(() => {
    if (!readyRef.current) return;
    changeTheme(defaultTheme);
    if (typography) {
      changeFontSize(fontSizeToCss(typography.fontSize));
      changeFontFamily(typography.fontFamily);
    }
  }, [defaultTheme, typography, changeTheme, changeFontSize, changeFontFamily]);

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
        defaultTheme={defaultTheme}
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
          if (cfi) onPositionChange(serializeEpubPosition({ cfi }));
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
      style={[styles.tocButton, { borderColor: theme.text }]}
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
    right: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
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
