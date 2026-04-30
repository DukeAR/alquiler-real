const DEMO_QUERY_KEY = 'demo';
const DEMO_QUERY_ENABLED_VALUE = 'true';

let demoModeRuntimeEnabled = false;
let demoNavigationInstalled = false;

export const isDemoModeSearch = (search: string) => {
  const searchParams = new URLSearchParams(search);
  return searchParams.get(DEMO_QUERY_KEY) === DEMO_QUERY_ENABLED_VALUE;
};

export const isDemoMode = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  if (isDemoModeSearch(window.location.search)) {
    demoModeRuntimeEnabled = true;
  }

  return demoModeRuntimeEnabled;
};

export const withDemoQuery = (target: string, search = typeof window === 'undefined' ? '' : window.location.search) => {
  if (!isDemoModeSearch(search)) {
    return target;
  }

  const [pathAndSearch, hashFragment] = target.split('#');
  const [pathname, rawQuery] = pathAndSearch.split('?');
  const searchParams = new URLSearchParams(rawQuery ?? '');

  searchParams.set(DEMO_QUERY_KEY, DEMO_QUERY_ENABLED_VALUE);

  const nextSearch = searchParams.toString();
  const nextHash = hashFragment ? `#${hashFragment}` : '';

  return `${pathname}${nextSearch ? `?${nextSearch}` : ''}${nextHash}`;
};

export const getDemoQueryState = () => ({ demo: DEMO_QUERY_ENABLED_VALUE });

const normalizeHistoryTarget = (target: string | URL | null | undefined) => {
  if (!target) {
    return target;
  }

  if (typeof target === 'string') {
    if (/^https?:\/\//i.test(target)) {
      const absoluteUrl = new URL(target);

      if (typeof window !== 'undefined' && absoluteUrl.origin !== window.location.origin) {
        return target;
      }

      absoluteUrl.searchParams.set(DEMO_QUERY_KEY, DEMO_QUERY_ENABLED_VALUE);
      return absoluteUrl.toString();
    }

    return withDemoQuery(target, '?demo=true');
  }

  if (typeof window !== 'undefined' && target.origin !== window.location.origin) {
    return target;
  }

  const nextTarget = new URL(target.toString());
  nextTarget.searchParams.set(DEMO_QUERY_KEY, DEMO_QUERY_ENABLED_VALUE);
  return nextTarget;
};

export const installDemoModeNavigationPersistence = () => {
  if (typeof window === 'undefined' || demoNavigationInstalled || !isDemoMode()) {
    return;
  }

  demoNavigationInstalled = true;

  const wrapHistoryMethod = (method: 'pushState' | 'replaceState') => {
    const originalMethod = window.history[method].bind(window.history);

    window.history[method] = ((state: unknown, unused: string, url?: string | URL | null) => {
      return originalMethod(state, unused, normalizeHistoryTarget(url) as string | URL | null | undefined);
    }) as History['pushState'];
  };

  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');
  window.history.replaceState(window.history.state, '', normalizeHistoryTarget(window.location.href) as string | URL | null | undefined);
};