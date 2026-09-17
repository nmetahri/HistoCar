import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";

interface AuthState {
  username: string | null;
  chargement: boolean;
  connecter: (username: string, password: string) => Promise<void>;
  deconnecter: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((moi) => setUsername(moi.username))
      .catch(() => setUsername(null))
      .finally(() => setChargement(false));
  }, []);

  async function connecter(usernameSaisi: string, password: string): Promise<void> {
    const moi = await api.login(usernameSaisi, password);
    setUsername(moi.username);
  }

  async function deconnecter(): Promise<void> {
    await api.logout();
    setUsername(null);
  }

  return (
    <AuthContext.Provider value={{ username, chargement, connecter, deconnecter }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
}
