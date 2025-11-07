(function () {
  const STORAGE_KEY = 'pestimator.auth.session';
  const amplifyGlobal = window.aws_amplify || {};
  const Amplify = amplifyGlobal.Amplify;
  const Auth = amplifyGlobal.Auth;
  const listeners = new Set();

  const OFFLINE_USERS = {
    Roeland: { password: 'Demo123', attributes: { name: 'Roeland' } }
  };

  let cachedSession = null;
  let syncPromise = null;

  function configureAmplify() {
    const config = window.PESTIMATOR_AMPLIFY_CONFIG;
    if (config && Amplify) {
      Amplify.configure(config);
    } else if (!config) {
      console.info('[Pestimator] Amplify config missing — running in offline demo mode.');
    }
  }

  configureAmplify();

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
    cachedSession = session || null;
    if (!session) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
    listeners.forEach((fn) => {
      try {
        fn(session || null);
      } catch (err) {
        console.error('[Pestimator] Auth listener failed', err);
      }
    });
  }

  async function hydrateFromAmplify() {
    if (!Auth || !window.PESTIMATOR_AMPLIFY_CONFIG) {
      return null;
    }
    try {
      const session = await Auth.currentSession();
      const user = await Auth.currentAuthenticatedUser();
      const idToken = session.getIdToken();
      const payload = {
        username: user.username,
        attributes: user.attributes || {},
        tokens: {
          idToken: idToken?.getJwtToken?.() || null,
          accessToken: session.getAccessToken()?.getJwtToken?.() || null
        },
        ownerId: user.attributes?.sub || user.username,
        provider: 'amplify',
        signedInAt: new Date().toISOString()
      };
      writeSession(payload);
      return payload;
    } catch (err) {
      console.info('[Pestimator] No Amplify session', err?.message || err);
      writeSession(null);
      return null;
    }
  }

  async function syncFromAmplify() {
    if (!syncPromise) {
      syncPromise = hydrateFromAmplify().finally(() => {
        syncPromise = null;
      });
    }
    return syncPromise;
  }

  async function signIn(username, password) {
    if (Auth && window.PESTIMATOR_AMPLIFY_CONFIG) {
      await Auth.signIn(username, password);
      return syncFromAmplify();
    }

    const trimmedUsername = (username || '').trim();
    if (!trimmedUsername) {
      throw new Error('Enter your username to sign in.');
    }
    if (!password) {
      throw new Error('Enter your access key to sign in.');
    }

    const offlineRecord = OFFLINE_USERS[trimmedUsername];
    if (offlineRecord) {
      if (offlineRecord.password !== password) {
        throw new Error('Incorrect password for this demo account.');
      }
      const payload = {
        username: trimmedUsername,
        attributes: offlineRecord.attributes,
        provider: 'demo',
        ownerId: trimmedUsername,
        signedInAt: new Date().toISOString()
      };
      writeSession(payload);
      return payload;
    }

    throw new Error('Account not recognized. Contact your administrator for access.');
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
    if (cachedSession) return cachedSession;
    const stored = readSession();
    cachedSession = stored;
    return stored;
  }

  async function ensureSession(options = {}) {
    const current = getSession();
    if (current?.provider === 'demo' || !window.PESTIMATOR_AMPLIFY_CONFIG) {
      return current;
    }
    try {
      const refreshed = await syncFromAmplify();
      if (!refreshed) {
        if (!options.silent) {
          throw new Error('Sign-in required');
        }
        return null;
      }
      return refreshed;
    } catch (err) {
      console.error('[Pestimator] Session sync failed', err);
      writeSession(null);
      if (!options.silent) {
        throw err instanceof Error ? err : new Error('Authentication failed');
      }
      return null;
    }
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function requireAuth(options = {}) {
    const session = getSession();
    if (session) return session;
    const redirectTo = options.redirectTo || './login.html';
    if (options?.redirect !== false) {
      window.location.href = redirectTo;
    }
    return null;
  }

  window.PestimatorAuth = {
    signIn,
    signOut,
    getSession,
    ensureSession,
    requireAuth,
    subscribe,
    syncFromAmplify
  };

  // Bootstrap immediately for signed-in users.
  syncFromAmplify();
})();
