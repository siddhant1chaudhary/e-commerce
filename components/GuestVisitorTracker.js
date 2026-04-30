import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthProvider';
import { VISITOR_MAX_DELTA_MS } from '../lib/visitorTracking';

const STORAGE_KEY = 'guest_visitor_id';
const PING_MS = 30_000;
const MIN_ACTIVE_CHUNK_MS = 5_000;

function randomUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateVisitorId() {
  if (typeof window === 'undefined') return null;
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function collectHints() {
  if (typeof window === 'undefined') return {};
  let timezone = '';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    timezone = '';
  }
  return {
    language: typeof navigator !== 'undefined' ? navigator.language || '' : '',
    timezone,
    screen:
      typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '',
    platform: typeof navigator !== 'undefined' ? navigator.platform || '' : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent || '' : '',
  };
}

function buildPayload(overrides) {
  const visitorId = getOrCreateVisitorId();
  if (!visitorId) return null;
  return {
    visitorId,
    activeDeltaMs: overrides.activeDeltaMs ?? 0,
    path: overrides.path || (typeof window !== 'undefined' ? window.location.pathname : ''),
    navigated: Boolean(overrides.navigated),
    referrer: overrides.referrer,
    hints: collectHints(),
  };
}

function postPing(payload) {
  if (!payload) return Promise.resolve();
  return fetch('/api/visitor/ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
}

/**
 * Anonymous storefront analytics for guests only: stable id in localStorage,
 * server IP + optional CDN country, language / timezone / screen without prompts.
 */
export default function GuestVisitorTracker() {
  const { user } = useAuth() || {};
  const router = useRouter();
  const lastTickRef = useRef(null);
  const skipNextRoutePing = useRef(true);

  const emitActiveTime = useCallback((opts = {}) => {
    if (user) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible' && !opts.force) {
      return;
    }
    const last = lastTickRef.current;
    if (!last) return;
    const now = Date.now();
    const raw = now - last;
    if (raw < MIN_ACTIVE_CHUNK_MS && !opts.force) return;
    const delta = Math.min(raw, VISITOR_MAX_DELTA_MS);
    lastTickRef.current = now;
    if (delta < 1000) return;
    postPing(buildPayload({ activeDeltaMs: delta, navigated: false }));
  }, [user]);

  useEffect(() => {
    if (user) return undefined;

    skipNextRoutePing.current = true;

    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return undefined;

    const firstReferrer =
      typeof document !== 'undefined' ? document.referrer || '' : '';

    postPing(
      buildPayload({
        navigated: true,
        referrer: firstReferrer,
      })
    );

    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      lastTickRef.current = Date.now();
    }

    const onRoute = (url) => {
      emitActiveTime({ force: true });
      const path = (url || '').split('?')[0] || '/';
      if (skipNextRoutePing.current) {
        skipNextRoutePing.current = false;
      } else {
        postPing(buildPayload({ navigated: true, path }));
      }
      if (document.visibilityState === 'visible') {
        lastTickRef.current = Date.now();
      }
    };

    router.events.on('routeChangeComplete', onRoute);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        lastTickRef.current = Date.now();
      } else {
        emitActiveTime({ force: true });
        lastTickRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    const interval = setInterval(() => {
      if (user || typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible' || !lastTickRef.current) return;
      emitActiveTime();
    }, PING_MS);

    const onHide = () => {
      if (user) return;
      const last = lastTickRef.current;
      if (!last) return;
      const delta = Math.min(Date.now() - last, VISITOR_MAX_DELTA_MS);
      lastTickRef.current = null;
      if (delta < 1000) return;
      const payload = buildPayload({ activeDeltaMs: delta, navigated: false });
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/visitor/ping', blob);
    };

    window.addEventListener('pagehide', onHide);

    return () => {
      router.events.off('routeChangeComplete', onRoute);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
      window.removeEventListener('pagehide', onHide);
      emitActiveTime({ force: true });
    };
  }, [user, router.events, emitActiveTime]);

  return null;
}
