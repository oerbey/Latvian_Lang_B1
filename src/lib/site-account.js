import { getCurrentUser, onAuthChange, reconcileAccount, signIn, signOut } from './email-auth.js';

const fallback = {
  checking: 'Checking sign-in…',
  anonymous: 'Playing as guest',
  authenticated: 'Signed in',
  reauth: 'Sign in again to connect your account',
  unavailable: 'Account unavailable. You can keep playing.',
  signIn: 'Sign in / Create account',
  signOut: 'Sign out',
  progress: 'My Progress',
  signInFailed: 'Sign-in could not start. Please try again.',
  signOutFailed: 'Signed out locally. Provider sign-out could not complete.',
};

/** Mount one account view; its state comes only from verified authentication, never game storage. */
export function mountSiteAccount(container) {
  let strings = fallback;
  let generation = 0;
  let busy = false;
  let reauthRequested = false;
  let current = { status: 'checking', user: null };
  let message = '';
  const status = document.createElement('span');
  status.id = 'site-account-status';
  status.className = 'dp-account__status';
  status.setAttribute('role', 'status');
  const progress = document.createElement('a');
  progress.href = 'my-progress.html';
  progress.className = 'dp-account__link';
  progress.id = 'site-progress-link';
  const login = document.createElement('button');
  login.type = 'button';
  login.id = 'site-sign-in';
  login.className = 'dp-account__button';
  const logout = document.createElement('button');
  logout.type = 'button';
  logout.id = 'site-sign-out';
  logout.className = 'dp-account__button';
  container.append(status, progress, login, logout);

  function render() {
    container.dataset.authStatus = current.status;
    status.textContent = message || strings[current.status] || strings.unavailable;
    login.textContent = current.status === 'reauth' ? strings.reauth : strings.signIn;
    logout.textContent = strings.signOut;
    progress.textContent = strings.progress;
    login.hidden = current.status === 'authenticated';
    logout.hidden = !current.user;
    login.disabled = busy || current.status === 'checking';
    logout.disabled = busy;
  }

  async function check() {
    const epoch = ++generation;
    const result = await getCurrentUser();
    if (epoch !== generation) return;
    current =
      reauthRequested && result.status === 'authenticated'
        ? { ...result, status: 'reauth' }
        : result;
    message = '';
    render();
  }

  onAuthChange(({ reason }) => {
    generation++;
    reauthRequested = false;
    current = { status: reason === 'signed-out' ? 'anonymous' : 'checking', user: null };
    message = '';
    render();
    if (!['signed-out', 'signing-in'].includes(reason)) void check();
  });

  window.addEventListener('llb1:auth-required', () => {
    reauthRequested = true;
    if (current.user) {
      current = { ...current, status: 'reauth' };
      render();
    }
  });

  async function interact(action) {
    busy = true;
    render();
    try {
      await action();
    } catch {
      const epoch = ++generation;
      const result =
        action === signOut ? { status: 'anonymous', user: null } : await getCurrentUser();
      if (epoch !== generation) return;
      current = result;
      message = action === signOut ? strings.signOutFailed : strings.signInFailed;
    } finally {
      busy = false;
      render();
    }
  }
  login.addEventListener('click', () => void interact(signIn));
  logout.addEventListener('click', () => void interact(signOut));

  function refresh() {
    reconcileAccount();
    void check();
  }
  window.addEventListener('focus', refresh);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('online', refresh);
  render();
  void check();

  let localeGeneration = 0;
  function loadStrings() {
    const epoch = ++localeGeneration;
    const language = document.documentElement.lang.split('-')[0];
    const locale = ['lv', 'ru'].includes(language) ? language : 'en';
    fetch(new URL(`../../i18n/${locale}.json`, import.meta.url))
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (epoch !== localeGeneration) return;
        strings = { ...fallback, ...data?.siteAccount };
        render();
      })
      .catch(() => {});
  }
  new MutationObserver(loadStrings).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
  loadStrings();
}
