import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * Persistence backend for reader settings. We prefer MMKV (synchronous, fast,
 * New-Arch friendly) but fall back to AsyncStorage if MMKV can't initialise on
 * this build — e.g. a JS-only reload before the native module ships. Settings
 * are small key/value prefs; no book content or secrets ever go here.
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
    return {
      getItem: (name) => AsyncStorage.getItem(name),
      setItem: (name, value) => AsyncStorage.setItem(name, value),
      removeItem: (name) => AsyncStorage.removeItem(name),
    };
  }
}

export const settingsStorage = createStorage();
