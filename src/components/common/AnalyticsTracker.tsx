import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initGA, trackPageView } from '../../lib/analytics';

/**
 * Headless route watcher component that initializes Google Analytics
 * and dispatches a page_view event on each SPA route transition.
 */
export function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    const fullPath = location.pathname + location.search;
    trackPageView(fullPath, document.title);
  }, [location.pathname, location.search]);

  return null;
}

