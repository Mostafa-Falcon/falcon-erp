'use client';

import { useCallback, useSyncExternalStore } from'react';

/**
 * Subscribes to a CSS media query and re-renders on change.
 *
 * Replaces the previous pattern of reading`window.innerWidth`inside an
 * effect, which produced two competing sources of truth for the layout
 * breakpoint: the JS number and the CSS`lg`variant.
 */
export function useMediaQuery(query: string): boolean {
 const subscribe = useCallback(
 (onStoreChange: () => void) => {
 const mql = window.matchMedia(query);
 mql.addEventListener('change', onStoreChange);
 return () => mql.removeEventListener('change', onStoreChange);
 },
 [query]
 );

 const getSnapshot = useCallback(() => {
 return window.matchMedia(query).matches;
 }, [query]);

 const getServerSnapshot = useCallback(() => false, []);

 return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**`true`at Tailwind's`lg`breakpoint and above (1024px). */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');