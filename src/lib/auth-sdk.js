let loading;

/** Load the same pinned SDK once on any page; a failed download can be retried. */
export function loadAuthSdk() {
  if (window.msal) return Promise.resolve(window.msal);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const src = new URL('../../assets/vendor/msal-browser/msal-browser.min.js', import.meta.url)
        .href;
      const script = document.createElement('script');
      script.addEventListener(
        'load',
        () => {
          if (window.msal) resolve(window.msal);
          else reject(new Error('Authentication SDK unavailable'));
        },
        { once: true },
      );
      script.addEventListener(
        'error',
        () => {
          script.remove();
          reject(new Error('Authentication SDK unavailable'));
        },
        {
          once: true,
        },
      );
      script.src = src;
      script.async = true;
      document.head.append(script);
    }).catch((error) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}
