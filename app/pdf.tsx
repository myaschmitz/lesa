import { PdfView } from '@kishannareshpal/expo-pdf';
import { useAssets } from 'expo-asset';
import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/**
 * Phase 1 build-pipeline proof.
 *
 * This screen exists only to exercise ONE native module (Apple PDFKit, via
 * `@kishannareshpal/expo-pdf`) end to end: bundle a PDF, resolve its local URI,
 * and render it through a native view. If this displays on a real iPhone, the
 * prebuild + EAS native pipeline works. It is NOT the real reader — that lands
 * behind the `ReaderView` abstraction in a later phase.
 */
export default function PdfProofScreen() {
  const [assets, error] = useAssets([require('@/assets/pdf/sample.pdf')]);
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    const asset = assets?.[0];
    if (!asset) return;
    asset
      .downloadAsync()
      .then((resolved) => setUri(resolved.localUri ?? resolved.uri))
      .catch(() => setUri(null));
  }, [assets]);

  if (Platform.OS === 'web') {
    return (
      <Centered>
        <ThemedText type="subtitle">PDF proof is iOS-only</ThemedText>
        <ThemedText type="small">The native PDF engine does not run on web.</ThemedText>
      </Centered>
    );
  }

  if (error) {
    return (
      <Centered>
        <ThemedText type="subtitle">Could not load sample PDF</ThemedText>
        <ThemedText type="small">{String(error)}</ThemedText>
      </Centered>
    );
  }

  if (!uri) {
    return (
      <Centered>
        <ActivityIndicator />
        <ThemedText type="small">Preparing sample PDF…</ThemedText>
      </Centered>
    );
  }

  return (
    <ThemedView style={styles.fill}>
      <PdfView style={styles.fill} uri={uri} fitMode="width" />
    </ThemedView>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.centered}>{children}</SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
});
