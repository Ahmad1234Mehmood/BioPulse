import { createContext, useContext, useState, useCallback, useEffect } from "react";

const AppContext = createContext(null);
let _id = 0;

export function AppProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "light" ? "light" : "dark";
  });

  const addToast = useCallback((message, type = "info") => {
    const id = ++_id;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  const toggleTheme = useCallback((newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  }, []);

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  }, [theme]);

  return (
    <AppContext.Provider value={{ toasts, addToast, theme, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
