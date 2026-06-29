import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, loadTokens, setTokens, getRefreshToken } from '../api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// Seeded demo accounts (see server/src/seed.js). For the "Try a demo account" buttons.
export const DEMO = {
  password: 'critiflix123',
  critic: 'adaeze@mail.com',
  creator: 'hello@kolafilms.tv',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [pendingOnboard, setPendingOnboard] = useState(false);

  useEffect(() => {
    (async () => {
      await loadTokens();
      try { setUser(await api.me()); } catch { await setTokens(null, null); }
      setReady(true);
    })();
  }, []);

  function store(res) {
    return setTokens(res.accessToken, res.refreshToken).then(() => res.user);
  }

  async function login(email, password) {
    const res = await api.login({ email, password });
    const u = await store(res);
    setPendingOnboard(false);
    setUser(u);
    return u;
  }

  async function register({ role = 'critic', ...payload }) {
    const res = await api.register({ role, ...payload });
    const u = await store(res);
    setPendingOnboard(role === 'creator'); // creators pick a plan before entering
    setUser(u);
    return u;
  }

  // Creator onboarding (channel link + studio info + credentials).
  const registerStudio = (payload) => register({ ...payload, role: 'creator' });

  // Sign in from an OTP-verify response ({ user, accessToken, refreshToken }).
  async function loginWithSession(res) {
    const u = await store(res);
    setPendingOnboard(false);
    setUser(u);
    return u;
  }

  // Quick demo sign-in with a seeded account.
  const demoLogin = (role) => login(DEMO[role], DEMO.password);

  function finishOnboard() { setPendingOnboard(false); }
  async function refresh() { setUser(await api.me()); }

  async function logout() {
    try { await api.logout(getRefreshToken()); } catch {}
    await setTokens(null, null);
    setPendingOnboard(false);
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, ready, pendingOnboard, login, register, registerStudio, demoLogin, loginWithSession, finishOnboard, refresh, logout, setUser }}>
      {children}
    </Ctx.Provider>
  );
}
