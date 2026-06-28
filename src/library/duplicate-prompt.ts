import { Alert } from 'react-native';

import type { ImportCandidate } from '@/library/import';
import type { Book } from '@/types/book';

export type DuplicateDecision = 'keep' | 'import';

/**
 * Asks the user how to handle a likely-duplicate import (matched by filename +
 * size). "Keep existing" preserves the current copy and its reading progress;
 * "Import anyway" adds a separate copy with its own independent progress.
 */
export function confirmDuplicate(
  existing: Book,
  candidate: ImportCandidate,
): Promise<DuplicateDecision> {
  return new Promise((resolve) => {
    Alert.alert(
      'Already in your library',
      `"${existing.title}" looks like it's already imported (${candidate.name}).`,
      [
        { text: 'Keep existing', style: 'cancel', onPress: () => resolve('keep') },
        { text: 'Import anyway', onPress: () => resolve('import') },
      ],
      { cancelable: true, onDismiss: () => resolve('keep') },
    );
  });
}
