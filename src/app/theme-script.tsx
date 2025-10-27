"use client";

import { useEffect } from "react";

export default function ThemeScript() {
  useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem("theme");

    if (
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  return null;
}
