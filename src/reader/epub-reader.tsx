import { Reader, ReaderProvider, useReader, type Theme } from '@epubjs-react-native/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { HIGHLIGHT_PAINT_OPACITY } from '@/theme/highlight-colors';
import { fontSizeToCss } from '@/theme/typography';

import { useEpubFileSystem } from './epub-file-system';
import { parseEpubPosition, serializeEpubPosition } from './epub-position';
import type { ReaderTheme, ReaderTypography, ReaderViewProps } from './types';

/** Message type posted by the injected tap detector below. */
const EPUB_TAP_MESSAGE = 'lesaEpubTap';

/**
 * Window used to disambiguate a tap on a highlight (which fires both the tap
 * detector and epub.js `markClicked`) from a tap on the page. The chrome toggle
 * is deferred this long and cancelled if a highlight press arrives.
 */
const TAP_PRESS_GUARD_MS = 80;

/**
 * Detects a deliberate tap *inside* the epub.js iframes and reports it back to
 * React Native. The library's own `onSingleTap` rides a wrapper outside the
 * WebView, which never sees touches that land on the page content in
 * scrolled-continuous flow — so the chrome could be hidden but never tapped back
 * into view. Running inside each section's document instead lets us tell a tap
 * (little movement, short press) from a scroll and post a single message. epub.js
 * renders each spine section in its own same-origin iframe, so we attach to the
 * ones already mounted and register a content hook for any rendered later.
 */
const TAP_DETECTION_JS = `(function () {
  if (window.__lesaTapInstalled) return;
  window.__lesaTapInstalled = true;
  var MOVE_TOLERANCE = 10;
  var MAX_DURATION = 300;
  function postTap() {
    try {
      var rn = window.ReactNativeWebView || window;
      rn.postMessage(JSON.stringify({ type: '${EPUB_TAP_MESSAGE}' }));
    } catch (e) {}
  }
  function attach(doc) {
    if (!doc || doc.__lesaTapDoc) return;
    doc.__lesaTapDoc = true;
    var startX = 0, startY = 0, startT = 0, moved = false;
    doc.addEventListener('touchstart', function (e) {
      var t = e.touches && e.touches[0];
      if (!t) return;
      startX = t.clientX; startY = t.clientY; startT = Date.now(); moved = false;
    }, true);
    doc.addEventListener('touchmove', function (e) {
      var t = e.touches && e.touches[0];
      if (!t) return;
      if (Math.abs(t.clientX - startX) > MOVE_TOLERANCE ||
          Math.abs(t.clientY - startY) > MOVE_TOLERANCE) moved = true;
    }, true);
    doc.addEventListener('touchend', function () {
      if (!moved && Date.now() - startT < MAX_DURATION) postTap();
    }, true);
  }
  try {
    if (typeof rendition !== 'undefined' && rendition) {
      if (rendition.hooks && rendition.hooks.content) {
        rendition.hooks.content.register(function (contents) {
          attach(contents && contents.document);
        });
      }
      var current = rendition.getContents ? rendition.getContents() : null;
      if (current && !current.forEach) current = [current];
      (current || []).forEach(function (c) { attach(c && c.document); });
    }
  } catch (e) {}
})();
true;`;

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
  controlsVisible = true,
  highlights = [],
  onPositionChange,
  onProgress,
  onCoverExtracted,
  onSelectionForHighlight,
  onPressHighlight,
  jumpTarget,
  onTap,
  onReady,
}: ReaderViewProps) {
  const { width, height } = useWindowDimensions();
  const {
    goToLocation,
    changeFontSize,
    changeFontFamily,
    changeTheme,
    getMeta,
    addAnnotation,
    removeAnnotationByCfi,
    removeSelection,
  } = useReader();
  const [tocVisible, setTocVisible] = useState(false);

  const initialCfi = useMemo(() => parseEpubPosition(initialPosition)?.cfi, [initialPosition]);
  // Frozen at mount: epub.js re-renders the WebView (and scrolls to the top) when
  // `defaultTheme` changes, so it only seeds the first paint. Live updates go
  // through changeTheme/changeFont* below.
  const [initialTheme] = useState(() => epubTheme(theme, typography));

  // Ignore location events until ready so the initial layout can't clobber a
  // saved CFI before the restore jump lands.
  const readyRef = useRef(false);
  // Drives the highlight reconcile / jump effects, which must wait until epub.js
  // has laid out the book before annotations can be painted or navigated to.
  const [engineReady, setEngineReady] = useState(false);
  // Latest known reading position, used to re-anchor after a reflow.
  const lastCfiRef = useRef<string | undefined>(initialCfi);
  // The cover is delivered once via a `meta` message after the book parses
  // (epub.js posts it asynchronously, after onReady), so emit it a single time.
  const coverEmittedRef = useRef(false);
  // id -> the {anchor, color} we have currently painted, so the reconcile effect
  // can diff against the incoming highlights prop and add/remove/recolour.
  const paintedRef = useRef<Map<string, { anchor: string; color: string }>>(new Map());
  // Tapping a highlight fires BOTH epub.js `markClicked` (→ onPressHighlight) and
  // the injected tap detector (→ onTap). We defer the chrome toggle briefly and
  // cancel it if a highlight press lands in the same window, so a highlight tap
  // opens its editor without also toggling the chrome.
  const pendingTapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnnotationPressAtRef = useRef(0);
  // Last jump nonce we acted on, so unrelated re-renders don't re-navigate.
  const lastJumpNonceRef = useRef<number | undefined>(undefined);

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

  // Reconcile the painted highlights against the desired set. epub.js stores
  // annotations internally and repaints them as each spine section renders, so
  // adding them once the engine is ready is enough — even for sections not yet
  // scrolled into view. The note/colour-token policy stays in the screen; the
  // engine only ever sees an opaque anchor and a resolved CSS colour.
  useEffect(() => {
    if (!engineReady) return;
    const painted = paintedRef.current;
    let added = false;

    // Remove highlights that are gone or whose anchor/colour changed.
    for (const [id, prev] of [...painted.entries()]) {
      const next = highlights.find((h) => h.id === id);
      if (!next || next.anchor !== prev.anchor || next.color !== prev.color) {
        removeAnnotationByCfi(prev.anchor);
        painted.delete(id);
      }
    }

    // Paint highlights we are not currently showing.
    for (const h of highlights) {
      if (painted.has(h.id)) continue;
      addAnnotation(
        'highlight',
        h.anchor,
        { id: h.id },
        {
          color: h.color,
          opacity: HIGHLIGHT_PAINT_OPACITY,
        },
      );
      painted.set(h.id, { anchor: h.anchor, color: h.color });
      added = true;
    }

    // Clear the blue OS selection left over from a just-created highlight.
    if (added) removeSelection();
  }, [highlights, engineReady, addAnnotation, removeAnnotationByCfi, removeSelection]);

  // Declarative jump-to-anchor for the highlights list. Re-runs only when the
  // nonce advances, so the same anchor can be re-targeted.
  useEffect(() => {
    if (!engineReady) return;
    const nonce = jumpTarget?.nonce;
    if (nonce == null || nonce === lastJumpNonceRef.current) return;
    lastJumpNonceRef.current = nonce;
    if (jumpTarget?.anchor) goToLocation(jumpTarget.anchor);
  }, [jumpTarget, engineReady, goToLocation]);

  // Cancel any deferred tap toggle on unmount.
  useEffect(
    () => () => {
      if (pendingTapRef.current) clearTimeout(pendingTapRef.current);
    },
    [],
  );

  const handleTapMessage = () => {
    // A highlight press just happened — this tap belongs to it; ignore it.
    if (Date.now() - lastAnnotationPressAtRef.current < TAP_PRESS_GUARD_MS) return;
    if (pendingTapRef.current) clearTimeout(pendingTapRef.current);
    pendingTapRef.current = setTimeout(() => {
      pendingTapRef.current = null;
      onTap?.();
    }, TAP_PRESS_GUARD_MS);
  };

  const handlePressAnnotation = (annotation: { data?: { id?: string } }) => {
    lastAnnotationPressAtRef.current = Date.now();
    if (pendingTapRef.current) {
      clearTimeout(pendingTapRef.current);
      pendingTapRef.current = null;
    }
    const id = annotation?.data?.id;
    if (typeof id === 'string') onPressHighlight?.(id);
  };

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
        // Enables native text selection inside the epub.js iframes and, by
        // leaving `menuItems` unset, keeps the system iOS callout menu
        // (Copy / Look Up / Share) from Phase 14. Without this the library injects
        // `user-select: none` / `-webkit-touch-callout: none` into every spine
        // section, which suppresses both selection and the menu. Persistent
        // highlights (Phase 15) ride on top of this via `onSelected` below — we
        // deliberately do NOT pass `menuItems`, which would replace the native
        // menu and regress Phase 14.
        enableSelection
        onSelected={(text, cfiRange) => onSelectionForHighlight?.(text, cfiRange)}
        onPressAnnotation={handlePressAnnotation}
        injectedJavascript={TAP_DETECTION_JS}
        onWebViewMessage={(event) => {
          if (event?.type === EPUB_TAP_MESSAGE) handleTapMessage();
        }}
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
          // Highlights can be painted / navigated to now that layout exists.
          setEngineReady(true);
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

      <ContentsButton theme={theme} visible={controlsVisible} onPress={() => setTocVisible(true)} />
      <ContentsModal theme={theme} visible={tocVisible} onClose={() => setTocVisible(false)} />
    </View>
  );
}

function ContentsButton({
  theme,
  visible,
  onPress,
}: {
  theme: ReaderTheme;
  visible: boolean;
  onPress: () => void;
}) {
  const [opacity] = useState(() => new Animated.Value(visible ? 1 : 0));

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.tocButton, { backgroundColor: theme.backgroundElement, opacity }]}
    >
      <Pressable accessibilityLabel="Chapters" onPress={onPress}>
        <Text style={{ color: theme.text }}>Chapters</Text>
      </Pressable>
    </Animated.View>
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
