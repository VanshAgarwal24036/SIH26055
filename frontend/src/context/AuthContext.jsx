import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "spectra_shakti_auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY);

      return storedUser
        ? JSON.parse(storedUser)
        : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(user)
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = ({ email, role }) => {
    const authenticatedUser = {
      email,
      role,
      name: email.split("@")[0],
      loginTime: new Date().toISOString(),
    };

    setUser(authenticatedUser);

    return authenticatedUser;
  };

  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: Boolean(user),
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}