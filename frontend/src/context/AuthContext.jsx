import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API = import.meta.env.VITE_API_URL;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check login status when app loads
  useEffect(() => {
    const token = localStorage.getItem("safetrail_token");

    if (token) {
      axios
        .get(`${API}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => {
          setUser(res.data.user);

          // Optional: keep a copy of user data
          localStorage.setItem(
            "user",
            JSON.stringify(res.data.user)
          );
        })
        .catch(() => {
          localStorage.removeItem("safetrail_token");
          localStorage.removeItem("user");
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // Login
  const login = (token, userData) => {
    localStorage.setItem("safetrail_token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  // Refresh the current user after profile/contact changes.
  const refreshUser = async () => {
    const token = localStorage.getItem("safetrail_token");
    if (!token) return null;
    const res = await axios.get(`${API}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser(res.data.user);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    return res.data.user;
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("safetrail_token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        refreshUser,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}