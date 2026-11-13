import { useCallback, useSyncExternalStore } from "react";

/**
 * Which proposal's chat panel is open: one at a time. The panels do not block the page (so the rest
 * of the site stays clickable with a chat open), which would let a second chat open on top of the
 * first one; opening a chat closes the other instead. The panel is one on the screen, so the state
 * that says which is open lives here and not in each proposal's chat.
 */
let active: string | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setActive(key: string | null) {
  if (active === key) return;
  active = key;
  listeners.forEach((listener) => listener());
}

/** Whether the chat of `key` is open, and how to open or close it; opening it closes any other. */
export function useActiveChat(key: string): [boolean, (open: boolean) => void] {
  const current = useSyncExternalStore(subscribe, () => active);
  const setOpen = useCallback(
    (open: boolean) => {
      if (open) setActive(key);
      else if (active === key) setActive(null);
    },
    [key],
  );
  return [current === key, setOpen];
}

/** Closes whichever chat is open, for tests that start from a clean screen. */
export function closeActiveChat() {
  setActive(null);
}
