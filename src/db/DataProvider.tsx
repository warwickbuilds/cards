import type { SQLiteDatabase } from 'expo-sqlite';
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

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
import { getVersion, subscribe } from './store';

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

/** Runs a read, and runs it again after any write. */
function useLive<T>(read: (db: SQLiteDatabase) => Promise<T>, initial: T, key: string): { data: T; loaded: boolean } {
  const db = useDb();
  const version = useSyncExternalStore(subscribe, getVersion, getVersion);
  const [state, setState] = useState<{ data: T; loaded: boolean; key: string }>({ data: initial, loaded: false, key });
  useEffect(() => {
    let live = true;
    read(db).then(
      (data) => live && setState({ data, loaded: true, key }),
      () => live && setState((s) => ({ ...s, loaded: true, key })),
    );
    return () => {
      live = false;
    };
    // read is recreated each render; key and version say when to re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, key]);
  // Never show data that belongs to a different key (e.g. another card).
  return state.key === key ? { data: state.data, loaded: state.loaded } : { data: initial, loaded: false };
}

const EMPTY_CARDS: CardSummary[] = [];
const EMPTY_CATS: Category[] = [];

export function useWallet() {
  const cards = useLive(listCardSummaries, EMPTY_CARDS, 'cards');
  const categories = useLive(listCategories, EMPTY_CATS, 'categories');
  return { cards: cards.data, categories: categories.data, loaded: cards.loaded && categories.loaded };
}

export function useCategories() {
  return useLive(listCategories, EMPTY_CATS, 'categories');
}

export function useCard(id: string | undefined) {
  return useLive<Card | null>((db) => (id ? getCard(db, id) : Promise.resolve(null)), null, `card:${id}`);
}

const NO_IMAGES: Partial<Record<Side, CardImage>> = {};
export function useCardImages(id: string | undefined) {
  return useLive((db) => (id ? getCardImages(db, id) : Promise.resolve(NO_IMAGES)), NO_IMAGES, `images:${id}`);
}

export function useSettings(): Settings {
  return useLive(getSettings, DEFAULT_SETTINGS, 'settings').data;
}

/** Settings plus whether they have been read yet (the lock waits for them). */
export function useSettingsStatus(): { settings: Settings; loaded: boolean } {
  const { data, loaded } = useLive(getSettings, DEFAULT_SETTINGS, 'settings');
  return { settings: data, loaded };
}
