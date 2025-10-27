// "use client";

// export default function ThemeToggle() {
//   const toggleTheme = () => {
//     const root = document.documentElement;
//     const isDark = root.classList.toggle("dark");
//     localStorage.setItem("theme", isDark ? "dark" : "light");
//   };

//   return (
//     <button
//       onClick={toggleTheme}
//       className="px-3 py-1 text-sm rounded bg-gray-200 text-gray-800 dark:bg-black shadow-lg dark:text-gray-100 h-12"
//     >
//       Toggle Theme
//     </button>
//   );
// }


"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // On mount, check saved theme or system preference
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentTheme = savedTheme || (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", currentTheme === "dark");
    setTheme(currentTheme as "light" | "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
    setTheme(newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="px-3 py-1 text-sm rounded bg-gray-800 text-white dark:bg-white shadow-lg dark:text-gray-800 h-10 rounded-full"
    >
      {theme === "dark" ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
