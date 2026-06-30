import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { highlightSwatchColor } from '@/theme/highlight-colors';
import type { ThemeTokens } from '@/theme/themes';
import type { Highlight } from '@/types/highlight';

interface Props {
  tokens: ThemeTokens;
  visible: boolean;
  highlights: Highlight[];
  /** Jump the reader to a highlight's opaque anchor, then close. */
  onJump: (anchor: string) => void;
  /** Open the editor for a highlight (note / colour / delete). */
  onEdit: (highlight: Highlight) => void;
  onClose: () => void;
}

/**
 * Per-book review list of saved highlights & notes. Tapping a row jumps the
 * reader to that highlight; the pencil opens the editor. Presentational — it
 * renders the highlights the screen hands it and reports intent back.
 */
export function HighlightsListSheet({
  tokens,
  visible,
  highlights,
  onJump,
  onEdit,
  onClose,
}: Props) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close highlights" />
      <View style={[styles.sheet, { backgroundColor: tokens.backgroundElement }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: tokens.text }]}>Highlights</Text>
          <Pressable onPress={onClose} accessibilityLabel="Done">
            <Text style={[styles.done, { color: tokens.text }]}>Done</Text>
          </Pressable>
        </View>

        {highlights.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
              No highlights yet. Select text while reading to highlight it.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            {highlights.map((h) => (
              <View
                key={h.id}
                style={[styles.row, { borderBottomColor: tokens.backgroundSelected }]}
              >
                <Pressable
                  style={styles.rowMain}
                  accessibilityLabel={`Jump to highlight: ${h.text}`}
                  onPress={() => onJump(h.anchor)}
                >
                  <View
                    style={[styles.swatch, { backgroundColor: highlightSwatchColor(h.color) }]}
                  />
                  <View style={styles.rowText}>
                    <Text numberOfLines={2} style={[styles.snippet, { color: tokens.text }]}>
                      {h.text}
                    </Text>
                    {h.note ? (
                      <Text
                        numberOfLines={2}
                        style={[styles.note, { color: tokens.textSecondary }]}
                      >
                        {h.note}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
                <Pressable
                  hitSlop={Spacing.two}
                  accessibilityLabel="Edit highlight"
                  onPress={() => onEdit(h)}
                  style={styles.editBtn}
                >
                  <SymbolView
                    name="square.and.pencil"
                    size={20}
                    tintColor={tokens.textSecondary}
                    fallback={
                      <Text style={[styles.editGlyph, { color: tokens.textSecondary }]}>✎</Text>
                    }
                  />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    maxHeight: '80%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#88888855',
    marginTop: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  title: { fontSize: 20, fontWeight: '600' },
  done: { fontSize: 16, fontWeight: '600' },
  body: { paddingBottom: Spacing.three },
  empty: { paddingVertical: Spacing.five, paddingHorizontal: Spacing.three },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  swatch: { width: 14, height: 14, borderRadius: 7, marginTop: 3 },
  rowText: { flex: 1, gap: 2 },
  snippet: { fontSize: 15, lineHeight: 20 },
  note: { fontSize: 13, lineHeight: 18 },
  editBtn: { padding: Spacing.two },
  editGlyph: { fontSize: 16 },
});
