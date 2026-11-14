export const getMeasurementId = (): string | undefined => {
  return import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
};

let isInitialized = false;

/**
 * Dynamically loads the Google Analytics gtag.js script and sets up
 * the dataLayer and global gtag function.
 */
export function initGA(): void {
  const id = getMeasurementId();

  if (!id || typeof window === 'undefined') {
    return;
  }

  if (isInitialized || document.getElementById('google-analytics-gtag')) {
    isInitialized = true;
    return;
  }

  // Create & inject gtag script
  const script = document.createElement('script');
  script.id = 'google-analytics-gtag';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);

  if (!window.gtag) {
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
    window.gtag('js', new Date());
  }

  // Configure GA4: send_page_view is false because React Router handles SPA route changes
  window.gtag('config', id, {
    send_page_view: false,
    anonymize_ip: true,
  });

  isInitialized = true;
}

/**
 * Tracks a page view on client-side route navigation.
 * Pushes to window.dataLayer for Google Tag Manager and dispatches to window.gtag.
 */
export function trackPageView(path: string, title?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const pageTitle = title || document.title;
  const pageLocation = window.location.href;

  // Push to GTM dataLayer
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: 'page_view',
      page_path: path,
      page_title: pageTitle,
      page_location: pageLocation,
    });
  }

  // Direct gtag dispatch if direct GA4 measurement ID is present
  const id = getMeasurementId();
  if (id && typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: pageTitle,
      page_location: pageLocation,
    });
  }
}

/**
 * Tracks a custom event in Google Tag Manager and Google Analytics.
 */
export function trackEvent(
  eventName: string,
  params: Record<string, unknown> = {}
): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Push to GTM dataLayer
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: eventName,
      ...params,
    });
  }

  // Direct gtag dispatch if direct GA4 measurement ID is present
  const id = getMeasurementId();
  if (id && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

