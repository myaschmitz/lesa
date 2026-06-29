import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ReaderChrome } from '@/components/reader-chrome';
import { ReaderSettingsSheet } from '@/components/reader-settings-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { bookFileExists, toAbsoluteUri } from '@/library/paths';
import { ReaderView, useReaderTheme, useReaderTypography, type ReaderProgress } from '@/reader';
import { useLibraryStore } from '@/store/library-store';
import { useSettingsStore } from '@/store/settings-store';
import { resolveThemeTokens } from '@/theme/themes';
import type { Book } from '@/types/book';

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

  const [book, setBook] = useState<Book | null>(() => books.find((b) => b.id === id) ?? null);
  const [notFound, setNotFound] = useState(false);
  const [ready, setReady] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [progress, setProgress] = useState<ReaderProgress | undefined>();

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
        />
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
