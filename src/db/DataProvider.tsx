import type { SQLiteDatabase } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

import {
  DEFAULT_SETTINGS,
  type Card,
  type CardImage,
  type CardSummary,
  type Category,
  type Settings,
  type Side,
} from '@/lib/types';

import { openDatabase } from './database';
import { getCard, getCardImages, getSettings, listCardSummaries, listCategories } from './repo';
import { getVersion, subscribe, type Scope } from './store';

const DbContext = createContext<SQLiteDatabase | null>(null);

export function DataProvider({
  children,
  fallback,
  onError,
}: {
  children: ReactNode;
  fallback: ReactNode;
  onError: (e: Error) => ReactNode;
}) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    openDatabase().then(setDb, (e: unknown) => setError(e instanceof Error ? e : new Error(String(e))));
  }, []);
  if (error) return onError(error);
  if (!db) return fallback;
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

export function useDb(): SQLiteDatabase {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb outside DataProvider');
  return db;
}

/** Runs a read, and runs it again only when its scope changes. */
function useLive<T>(
  read: (db: SQLiteDatabase) => Promise<T>,
  initial: T,
  key: string,
  scope: Scope,
): { data: T; loaded: boolean; error: Error | null } {
  const db = useDb();
  const sub = useCallback((listener: () => void) => subscribe(scope, listener), [scope]);
  const snap = useCallback(() => getVersion(scope), [scope]);
  const version = useSyncExternalStore(sub, snap, snap);
  const [state, setState] = useState<{ data: T; loaded: boolean; error: Error | null; key: string }>({
    data: initial,
    loaded: false,
    error: null,
    key,
  });
  useEffect(() => {
    let live = true;
    read(db).then(
      (data) => live && setState({ data, loaded: true, error: null, key }),
      (e: unknown) => {
        if (!live) return;
        const err = e instanceof Error ? e : new Error(String(e));
        if (__DEV__) console.warn(`DB read failed (${key}):`, err);
        setState((s) => ({ ...s, loaded: true, error: err, key }));
      },
    );
    return () => {
      live = false;
    };
    // read is recreated each render; key and version say when to re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, key]);
  // Never show data that belongs to a different key (e.g. another card).
  return state.key === key
    ? { data: state.data, loaded: state.loaded, error: state.error }
    : { data: initial, loaded: false, error: null };
}

const EMPTY_CARDS: CardSummary[] = [];
const EMPTY_CATS: Category[] = [];

export function useWallet() {
  const cards = useLive(listCardSummaries, EMPTY_CARDS, 'cards', 'cards');
  const categories = useLive(listCategories, EMPTY_CATS, 'categories', 'categories');
  return {
    cards: cards.data,
    categories: categories.data,
    loaded: cards.loaded && categories.loaded,
    error: cards.error ?? categories.error,
  };
}

export function useCategories() {
  return useLive(listCategories, EMPTY_CATS, 'categories', 'categories');
}

export function useCard(id: string | undefined) {
  return useLive<Card | null>((db) => (id ? getCard(db, id) : Promise.resolve(null)), null, `card:${id}`, 'cards');
}

const NO_IMAGES: Partial<Record<Side, CardImage>> = {};
export function useCardImages(id: string | undefined) {
  return useLive(
    (db) => (id ? getCardImages(db, id) : Promise.resolve(NO_IMAGES)),
    NO_IMAGES,
    `images:${id}`,
    'images',
  );
}

export function useSettings(): Settings {
  return useLive(getSettings, DEFAULT_SETTINGS, 'settings', 'settings').data;
}

/** Settings plus whether they have been read yet (the lock waits for them). */
export function useSettingsStatus(): { settings: Settings; loaded: boolean } {
  const { data, loaded } = useLive(getSettings, DEFAULT_SETTINGS, 'settings', 'settings');
  return { settings: data, loaded };
}
