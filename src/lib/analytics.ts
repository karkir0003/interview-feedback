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

  // Initialize dataLayer and gtag helper
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };

  window.gtag('js', new Date());

  // Configure GA4: send_page_view is false because React Router handles SPA route changes
  window.gtag('config', id, {
    send_page_view: false,
    anonymize_ip: true,
  });

  isInitialized = true;
}

/**
 * Tracks a page view on client-side route navigation.
 */
export function trackPageView(path: string, title?: string): void {
  const id = getMeasurementId();
  if (!id || typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

/**
 * Tracks a custom event in Google Analytics.
 */
export function trackEvent(
  eventName: string,
  params: Record<string, unknown> = {}
): void {
  const id = getMeasurementId();
  if (!id || typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', eventName, params);
}

