import type { StateStorage } from 'zustand/middleware';

/**
 * Persistence backend for reader settings. We prefer MMKV (synchronous, fast,
 * New-Arch friendly) but fall back to AsyncStorage if MMKV can't initialise on
 * this build. Both modules are required lazily so a missing native module never
 * crashes module load or surfaces a spurious "X is null" error in the happy
 * path. Settings are small key/value prefs; no book content or secrets here.
 */
function createStorage(): StateStorage {
  try {
    // Lazy require so a missing/unbuilt native module can't crash module load.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    const mmkv = createMMKV({ id: 'lesa-settings' });
    return {
      getItem: (name) => mmkv.getString(name) ?? null,
      setItem: (name, value) => mmkv.set(name, value),
      removeItem: (name) => mmkv.remove(name),
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[settings] MMKV unavailable, using AsyncStorage:', error);
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage')
      .default as typeof import('@react-native-async-storage/async-storage').default;
    return {
      getItem: (name) => AsyncStorage.getItem(name),
      setItem: (name, value) => AsyncStorage.setItem(name, value),
      removeItem: (name) => AsyncStorage.removeItem(name),
    };
  }
}

export const settingsStorage = createStorage();
