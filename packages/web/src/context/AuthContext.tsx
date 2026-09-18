import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { api } from "@/api/client";

interface AuthState {
  username: string | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((me) => setUsername(me.username))
      .catch(() => setUsername(null))
      .finally(() => setLoading(false));
  }, []);

  async function signIn(submittedUsername: string, password: string): Promise<void> {
    const me = await api.login(submittedUsername, password);
    setUsername(me.username);
  }

  async function signOut(): Promise<void> {
    await api.logout();
    setUsername(null);
  }

  return (
    <AuthContext.Provider value={{ username, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
