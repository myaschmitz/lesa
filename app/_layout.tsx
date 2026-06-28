import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { useIncomingBooks } from '@/hooks/use-incoming-books';
import { useLibraryStore } from '@/store/library-store';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const init = useLibraryStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  useIncomingBooks();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </ThemeProvider>
  );
}
