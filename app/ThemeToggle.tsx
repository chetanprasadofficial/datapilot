"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const l = localStorage.getItem("dp_theme") === "light";
    setLight(l);
    document.documentElement.dataset.theme = l ? "light" : "dark";
  }, []);
  function flip() {
    const n = !light;
    setLight(n);
    document.documentElement.dataset.theme = n ? "light" : "dark";
    localStorage.setItem("dp_theme", n ? "light" : "dark");
  }
  return (
    <button onClick={flip} aria-label="Toggle theme" className="dp-toggle">
      {light ? "Dark mode" : "Light mode"}
    </button>
  );
}
