/**
 * Scoped change counters: each write bumps only the slices it touches, so
 * unrelated screens and thumbnail queries don't re-run.
 */

export type Scope = 'cards' | 'categories' | 'settings' | 'images';

type Listener = () => void;

const ALL_SCOPES: readonly Scope[] = ['cards', 'categories', 'settings', 'images'];

const versions: Record<Scope, number> = {
  cards: 0,
  categories: 0,
  settings: 0,
  images: 0,
};

const listeners: Record<Scope, Set<Listener>> = {
  cards: new Set(),
  categories: new Set(),
  settings: new Set(),
  images: new Set(),
};

export function changed(...scopes: Scope[]) {
  const targets = scopes.length > 0 ? scopes : ALL_SCOPES;
  for (const scope of targets) {
    versions[scope]++;
    for (const l of listeners[scope]) l();
  }
}

export function subscribe(scope: Scope, l: Listener) {
  listeners[scope].add(l);
  return () => {
    listeners[scope].delete(l);
  };
}

export function getVersion(scope: Scope) {
  return versions[scope];
}
