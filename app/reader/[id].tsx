import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { HighlightColorBar } from '@/components/highlight-color-bar';
import { HighlightNoteEditor } from '@/components/highlight-note-editor';
import { HighlightsListSheet } from '@/components/highlights-list-sheet';
import { ReaderChrome } from '@/components/reader-chrome';
import { ReaderSettingsSheet } from '@/components/reader-settings-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { bookFileExists, toAbsoluteUri } from '@/library/paths';
import {
  ReaderView,
  useReaderTheme,
  useReaderTypography,
  type ReaderHighlight,
  type ReaderProgress,
} from '@/reader';
import { useHighlightsStore } from '@/store/highlights-store';
import { useLibraryStore } from '@/store/library-store';
import { useSettingsStore } from '@/store/settings-store';
import { DEFAULT_HIGHLIGHT_COLOR, resolveHighlightPaintColor } from '@/theme/highlight-colors';
import { resolveThemeTokens } from '@/theme/themes';
import type { Book } from '@/types/book';
import type { HighlightColorKey } from '@/types/highlight';

const POSITION_SAVE_DEBOUNCE_MS = 800;
const CHROME_AUTO_HIDE_MS = 3000;

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; book: Book; absolutePath: string };

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = useReaderTheme();
  const typography = useReaderTypography();
  const themeName = useSettingsStore((s) => s.themeName);
  const tokens = useMemo(
    () => resolveThemeTokens(themeName, scheme === 'dark'),
    [themeName, scheme],
  );
  const pdfPaging = useSettingsStore((s) => s.pdfPaging);
  const pdfFit = useSettingsStore((s) => s.pdfFit);
  const books = useLibraryStore((s) => s.books);
  const loadBook = useLibraryStore((s) => s.loadBook);
  const markOpened = useLibraryStore((s) => s.markOpened);
  const saveReadingPosition = useLibraryStore((s) => s.saveReadingPosition);
  const saveCover = useLibraryStore((s) => s.saveCover);
  const saveProgress = useLibraryStore((s) => s.saveProgress);

  const highlightsByBook = useHighlightsStore((s) => s.byBook);
  const loadHighlights = useHighlightsStore((s) => s.loadForBook);
  const addHighlight = useHighlightsStore((s) => s.add);
  const setHighlightNote = useHighlightsStore((s) => s.setNote);
  const setHighlightColor = useHighlightsStore((s) => s.setColor);
  const removeHighlight = useHighlightsStore((s) => s.remove);

  const [book, setBook] = useState<Book | null>(() => books.find((b) => b.id === id) ?? null);
  const [notFound, setNotFound] = useState(false);
  const [ready, setReady] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [progress, setProgress] = useState<ReaderProgress | undefined>();

  // Persistent-highlight UI state. Only EPUB supports highlights today.
  const isEpub = book?.format === 'epub';
  const [pendingSelection, setPendingSelection] = useState<{ text: string; anchor: string } | null>(
    null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [autoFocusNote, setAutoFocusNote] = useState(false);
  const [highlightsVisible, setHighlightsVisible] = useState(false);
  const [jumpTarget, setJumpTarget] = useState<{ anchor: string; nonce: number } | undefined>();
  const jumpNonceRef = useRef(0);

  const bookHighlights = useMemo(
    () => (book ? (highlightsByBook[book.id] ?? []) : []),
    [book, highlightsByBook],
  );

  // Engine-neutral highlights: opaque anchor + a colour resolved for the current
  // surface. The engine never sees palette tokens or notes.
  const readerHighlights = useMemo<ReaderHighlight[]>(
    () =>
      bookHighlights.map((h) => ({
        id: h.id,
        anchor: h.anchor,
        color: resolveHighlightPaintColor(h.color, tokens.isDark),
      })),
    [bookHighlights, tokens.isDark],
  );

  // The highlight currently open in the editor, derived live from the store so
  // colour/note edits reflect immediately.
  const editingHighlight = useMemo(
    () => (editingId ? (bookHighlights.find((h) => h.id === editingId) ?? null) : null),
    [editingId, bookHighlights],
  );

  // Load saved highlights once the EPUB is known.
  useEffect(() => {
    if (book && isEpub) void loadHighlights(book.id);
  }, [book, isEpub, loadHighlights]);

  const handleSelectionForHighlight = useCallback((text: string, anchor: string) => {
    setPendingSelection({ text, anchor });
  }, []);

  const createFromPending = useCallback(
    async (color: HighlightColorKey, openNote: boolean) => {
      if (!book || !pendingSelection) return;
      const row = await addHighlight({
        bookId: book.id,
        anchor: pendingSelection.anchor,
        color,
        text: pendingSelection.text,
      });
      setPendingSelection(null);
      if (openNote && row) {
        setAutoFocusNote(true);
        setEditingId(row.id);
      }
    },
    [book, pendingSelection, addHighlight],
  );

  const handlePressHighlight = useCallback((id: string) => {
    setAutoFocusNote(false);
    setEditingId(id);
  }, []);

  const closeEditor = useCallback(() => {
    setEditingId(null);
    setAutoFocusNote(false);
  }, []);

  const handleSaveNote = useCallback(
    (hid: string, note: string) => {
      void setHighlightNote(hid, note);
      closeEditor();
    },
    [setHighlightNote, closeEditor],
  );

  const handleDeleteHighlight = useCallback(
    (hid: string) => {
      void removeHighlight(hid);
      closeEditor();
    },
    [removeHighlight, closeEditor],
  );

  const handleChangeColor = useCallback(
    (hid: string, color: HighlightColorKey) => {
      void setHighlightColor(hid, color);
    },
    [setHighlightColor],
  );

  const handleJumpToHighlight = useCallback((anchor: string) => {
    jumpNonceRef.current += 1;
    setJumpTarget({ anchor, nonce: jumpNonceRef.current });
    setHighlightsVisible(false);
  }, []);

  const openHighlightsList = useCallback(() => {
    setChromeVisible(true);
    setHighlightsVisible(true);
  }, []);

  // Cold start / deep link: the catalog may not be in memory yet, so resolve the
  // book through the store (which falls back to the database).
  useEffect(() => {
    if (book || !id) return;
    let active = true;
    void loadBook(id).then((row) => {
      if (!active) return;
      if (row) setBook(row);
      else setNotFound(true);
    });
    return () => {
      active = false;
    };
  }, [id, book, loadBook]);

  // Record the open once we know the book (used for last-read ordering later).
  useEffect(() => {
    if (book) void markOpened(book.id);
  }, [book, markOpened]);

  const { debounced: persistPosition } = useDebouncedCallback((position: string) => {
    if (book) void saveReadingPosition(book.id, position);
  }, POSITION_SAVE_DEBOUNCE_MS);

  const { debounced: persistProgress } = useDebouncedCallback((fraction: number) => {
    if (book) void saveProgress(book.id, fraction);
  }, POSITION_SAVE_DEBOUNCE_MS);

  const handleProgress = useCallback(
    (p: ReaderProgress) => {
      setProgress(p);
      const fraction = p.fraction ?? (p.page && p.pageCount ? p.page / p.pageCount : undefined);
      if (typeof fraction === 'number') persistProgress(fraction);
    },
    [persistProgress],
  );

  const handleCover = useCallback(
    (dataUrl: string) => {
      if (book && !book.coverRelativePath) void saveCover(book.id, dataUrl);
    },
    [book, saveCover],
  );

  // Auto-hide chrome after a short idle so the book fills the screen while
  // reading; showing it (toggle/settings) restarts the timer.
  useEffect(() => {
    if (!chromeVisible || settingsVisible) return;
    const t = setTimeout(() => setChromeVisible(false), CHROME_AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [chromeVisible, settingsVisible]);

  const toggleChrome = useCallback(() => setChromeVisible((v) => !v), []);
  const openSettings = useCallback(() => {
    setChromeVisible(true);
    setSettingsVisible(true);
  }, []);

  const state: LoadState = useMemo(() => {
    if (notFound) return { status: 'missing' };
    if (!book) return { status: 'loading' };
    if (!bookFileExists(book.relativePath)) return { status: 'missing' };
    return { status: 'ready', book, absolutePath: toAbsoluteUri(book.relativePath) };
  }, [book, notFound]);

  const showLoadingOverlay = state.status === 'loading' || (state.status === 'ready' && !ready);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {state.status === 'ready' ? (
        <View style={styles.fill}>
          <ReaderView
            format={state.book.format}
            absolutePath={state.absolutePath}
            initialPosition={state.book.lastPosition ?? undefined}
            theme={theme}
            typography={typography}
            controlsVisible={chromeVisible}
            pdfPaging={pdfPaging}
            pdfFit={pdfFit}
            highlights={isEpub ? readerHighlights : undefined}
            jumpTarget={isEpub ? jumpTarget : undefined}
            onSelectionForHighlight={isEpub ? handleSelectionForHighlight : undefined}
            onPressHighlight={isEpub ? handlePressHighlight : undefined}
            onPositionChange={persistPosition}
            onProgress={handleProgress}
            onCoverExtracted={handleCover}
            onTap={toggleChrome}
            onReady={() => setReady(true)}
          />
        </View>
      ) : null}

      {state.status === 'missing' ? <MissingState /> : null}

      {showLoadingOverlay ? (
        <View style={[styles.overlay, { backgroundColor: theme.background }]}>
          <ActivityIndicator color={theme.text} />
        </View>
      ) : null}

      {state.status === 'ready' && ready ? (
        <ReaderChrome
          tokens={tokens}
          visible={chromeVisible}
          title={state.book.title}
          progress={progress}
          onClose={() => router.back()}
          onOpenSettings={openSettings}
          onOpenHighlights={isEpub ? openHighlightsList : undefined}
        />
      ) : null}

      {state.status === 'ready' && isEpub ? (
        <>
          <HighlightColorBar
            tokens={tokens}
            visible={pendingSelection !== null}
            onPick={(color) => void createFromPending(color, false)}
            onAddNote={() => void createFromPending(DEFAULT_HIGHLIGHT_COLOR, true)}
            onDismiss={() => setPendingSelection(null)}
          />
          <HighlightsListSheet
            tokens={tokens}
            visible={highlightsVisible}
            highlights={bookHighlights}
            onJump={handleJumpToHighlight}
            onEdit={(h) => {
              setHighlightsVisible(false);
              setAutoFocusNote(false);
              setEditingId(h.id);
            }}
            onClose={() => setHighlightsVisible(false)}
          />
          <HighlightNoteEditor
            tokens={tokens}
            highlight={editingHighlight}
            autoFocusNote={autoFocusNote}
            onChangeColor={handleChangeColor}
            onSave={handleSaveNote}
            onDelete={handleDeleteHighlight}
            onClose={closeEditor}
          />
        </>
      ) : null}

      {state.status === 'ready' ? (
        <ReaderSettingsSheet
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          format={state.book.format}
        />
      ) : null}
    </View>
  );
}

function MissingState() {
  const router = useRouter();

  return (
    <View style={styles.centered}>
      <ThemedText type="subtitle" style={styles.centeredText}>
        Couldn&apos;t open this book
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centeredText}>
        Its file is no longer on this device. Try importing it again.
      </ThemedText>
      <Pressable onPress={() => router.back()}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Back to Library
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  centeredText: {
    textAlign: 'center',
  },
});
