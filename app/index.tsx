import { useMemo } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCard } from '@/components/book-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLibraryStore } from '@/store/library-store';
import type { Book } from '@/types/book';

const NUM_COLUMNS = 3;

export default function LibraryScreen() {
  const theme = useTheme();
  const books = useLibraryStore((s) => s.books);
  const status = useLibraryStore((s) => s.status);
  const importing = useLibraryStore((s) => s.importing);
  const importFromPicker = useLibraryStore((s) => s.importFromPicker);
  const removeBook = useLibraryStore((s) => s.removeBook);

  const isInitialLoading = status === 'loading' && books.length === 0;

  const onImport = () => {
    void importFromPicker();
  };

  const onOpenBook = (_book: Book) => {
    Alert.alert('Reader coming soon', 'Reading is added in a later phase. The book is saved here.');
  };

  const onRemoveBook = (book: Book) => {
    Alert.alert('Remove book', `Remove "${book.title}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void removeBook(book.id) },
    ]);
  };

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <ThemedText type="title">Library</ThemedText>
        <ImportButton onPress={onImport} loading={importing} accent={theme.text} />
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [importing, theme.text],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {isInitialLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        ) : books.length === 0 ? (
          <View style={styles.centered}>
            {header}
            <EmptyState onImport={onImport} importing={importing} />
          </View>
        ) : (
          <FlatList
            data={books}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            ListHeaderComponent={header}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <BookCard book={item} onPress={onOpenBook} onLongPress={onRemoveBook} />
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function ImportButton({
  onPress,
  loading,
  accent,
}: {
  onPress: () => void;
  loading: boolean;
  accent: string;
}) {
  return (
    <Pressable onPress={onPress} disabled={loading} hitSlop={Spacing.two}>
      <ThemedView type="backgroundElement" style={styles.importButton}>
        {loading ? (
          <ActivityIndicator size="small" color={accent} />
        ) : (
          <ThemedText type="smallBold">+ Import</ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}

function EmptyState({ onImport, importing }: { onImport: () => void; importing: boolean }) {
  return (
    <View style={styles.empty}>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        No books yet
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
        Import an EPUB or PDF and it lives here for good — available offline and after a reinstall.
      </ThemedText>
      <Pressable onPress={onImport} disabled={importing}>
        <ThemedView type="backgroundSelected" style={styles.emptyButton}>
          <ThemedText type="smallBold">Import a book</ThemedText>
        </ThemedView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  importButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    minWidth: 88,
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },
  row: {
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  centered: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
  },
});
