(function () {
  const STORAGE_KEY = 'pestimator.auth.session';
  const amplifyGlobal = window.aws_amplify || {};
  const Amplify = amplifyGlobal.Amplify;
  const Auth = amplifyGlobal.Auth;
  const listeners = new Set();

  function configureAmplify() {
    const config = window.PESTIMATOR_AMPLIFY_CONFIG;
    if (config && Amplify) {
      Amplify.configure(config);
    } else if (!config) {
      console.info('[Pestimator] Amplify config missing — running in offline demo mode.');
    }
  }

  function readSession() {
    try {
      const value = sessionStorage.getItem(STORAGE_KEY);
      if (!value) return null;
      return JSON.parse(value);
    } catch (err) {
      console.warn('[Pestimator] Unable to parse auth session', err);
      return null;
    }
  }

  function writeSession(session) {
    if (!session) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
    listeners.forEach((fn) => {
      try { fn(session || null); } catch (_) {}
    });
  }

  async function syncFromAmplify() {
    if (!Auth || !window.PESTIMATOR_AMPLIFY_CONFIG) return null;
    try {
      const user = await Auth.currentAuthenticatedUser();
      const session = await Auth.currentSession();
      const idToken = session.getIdToken();
      const profile = {
        username: user.username,
        attributes: user.attributes || {},
        tokens: {
          idToken: idToken?.getJwtToken?.() || null,
          accessToken: session.getAccessToken()?.getJwtToken?.() || null
        },
        provider: 'amplify',
        signedInAt: new Date().toISOString()
      };
      writeSession(profile);
      return profile;
    } catch (err) {
      console.info('[Pestimator] No Amplify user session found.');
      writeSession(null);
      return null;
    }
  }

  async function signIn(username, password) {
    if (Auth && window.PESTIMATOR_AMPLIFY_CONFIG) {
      const user = await Auth.signIn(username, password);
      const session = await Auth.currentSession();
      const idToken = session.getIdToken();
      const payload = {
        username: user.username,
        attributes: user.attributes || {},
        tokens: {
          idToken: idToken?.getJwtToken?.() || null,
          accessToken: session.getAccessToken()?.getJwtToken?.() || null
        },
        provider: 'amplify',
        signedInAt: new Date().toISOString()
      };
      writeSession(payload);
      return payload;
    }

    // Offline demo mode fallback: accept any non-empty credentials.
    if (!username) {
      throw new Error('Enter your email to sign in.');
    }
    if (!password) {
      throw new Error('Enter your access key to sign in.');
    }
    const payload = {
      username,
      provider: 'demo',
      signedInAt: new Date().toISOString()
    };
    writeSession(payload);
    return payload;
  }

  async function signOut() {
    if (Auth && window.PESTIMATOR_AMPLIFY_CONFIG) {
      try {
        await Auth.signOut();
      } catch (err) {
        console.warn('[Pestimator] Amplify sign-out failed', err);
      }
    }
    writeSession(null);
  }

  function getSession() {
    return readSession();
  }

  function requireAuth(options = {}) {
    const session = readSession();
    if (session) return session;

    const redirectTo = options.redirectTo || './login.html';
    if (options?.redirect !== false) {
      window.location.href = redirectTo;
    }
    return null;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  configureAmplify();
  // Attempt to hydrate from an existing Amplify session.
  syncFromAmplify();

  window.PestimatorAuth = {
    signIn,
    signOut,
    getSession,
    requireAuth,
    subscribe,
    refresh: syncFromAmplify
  };
})();
