import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import {
  HIGHLIGHT_COLOR_KEYS,
  highlightColorLabel,
  highlightSwatchColor,
} from '@/theme/highlight-colors';
import type { ThemeTokens } from '@/theme/themes';
import type { Highlight, HighlightColorKey } from '@/types/highlight';

interface Props {
  tokens: ThemeTokens;
  /** The highlight being edited, or null when the editor is closed. */
  highlight: Highlight | null;
  /** Focus the note field on open (used right after creating a highlight). */
  autoFocusNote?: boolean;
  /** Change the highlight's colour (applied live). */
  onChangeColor: (id: string, color: HighlightColorKey) => void;
  /** Persist the note text (empty clears it) and close. */
  onSave: (id: string, note: string) => void;
  /** Delete the highlight and close. */
  onDelete: (id: string) => void;
  /** Close without saving the note. */
  onClose: () => void;
}

/**
 * Edit surface for a single highlight: change its colour, edit/clear its note, or
 * delete it. Opened both by tapping a highlight in the reader and from the
 * highlights list. Presentational — all persistence is the screen's job.
 */
export function HighlightNoteEditor({
  tokens,
  highlight,
  autoFocusNote,
  onChangeColor,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [note, setNote] = useState('');
  // Re-seed the field when a different highlight opens (and reset when closed),
  // using the render-phase "adjust state on prop change" pattern rather than an
  // effect. The editor owns the text while a highlight is open.
  const [seedId, setSeedId] = useState<string | null>(null);
  if (highlight && highlight.id !== seedId) {
    setSeedId(highlight.id);
    setNote(highlight.note ?? '');
  } else if (!highlight && seedId !== null) {
    setSeedId(null);
  }

  const visible = highlight !== null;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close note editor" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { backgroundColor: tokens.backgroundElement }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Pressable onPress={onClose} accessibilityLabel="Cancel">
              <Text style={[styles.headerBtn, { color: tokens.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.title, { color: tokens.text }]}>Highlight</Text>
            <Pressable
              onPress={() => highlight && onSave(highlight.id, note)}
              accessibilityLabel="Save note"
            >
              <Text style={[styles.headerBtn, { color: tokens.text }]}>Save</Text>
            </Pressable>
          </View>

          {highlight ? (
            <Text numberOfLines={3} style={[styles.snippet, { color: tokens.textSecondary }]}>
              “{highlight.text}”
            </Text>
          ) : null}

          <View style={styles.swatches}>
            {HIGHLIGHT_COLOR_KEYS.map((key) => {
              const selected = highlight?.color === key;
              return (
                <Pressable
                  key={key}
                  accessibilityLabel={`${highlightColorLabel(key)}${selected ? ', selected' : ''}`}
                  onPress={() => highlight && onChangeColor(highlight.id, key)}
                  style={[
                    styles.swatch,
                    { backgroundColor: highlightSwatchColor(key) },
                    selected && [styles.swatchSelected, { borderColor: tokens.text }],
                  ]}
                />
              );
            })}
          </View>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note…"
            placeholderTextColor={tokens.textSecondary}
            autoFocus={autoFocusNote}
            multiline
            style={[
              styles.input,
              {
                color: tokens.text,
                backgroundColor: tokens.background,
                borderColor: tokens.backgroundSelected,
              },
            ]}
          />

          <Pressable
            onPress={() => highlight && onDelete(highlight.id)}
            accessibilityLabel="Delete highlight"
            style={styles.deleteRow}
          >
            <Text style={[styles.deleteText, { color: '#E5484D' }]}>Delete highlight</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const SWATCH = 36;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
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
  headerBtn: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '600' },
  snippet: { fontSize: 14, fontStyle: 'italic', marginBottom: Spacing.three },
  swatches: { flexDirection: 'row', gap: Spacing.three, marginBottom: Spacing.three },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: { borderWidth: 3 },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  deleteRow: { paddingVertical: Spacing.three, alignItems: 'center', marginTop: Spacing.two },
  deleteText: { fontSize: 16, fontWeight: '600' },
});
