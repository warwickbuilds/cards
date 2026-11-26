/** A tiny change counter: writes bump it, and hooks re-read when it moves. */

type Listener = () => void;
let version = 0;
const listeners = new Set<Listener>();

export function changed() {
  version++;
  for (const l of listeners) l();
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getVersion() {
  return version;
}
