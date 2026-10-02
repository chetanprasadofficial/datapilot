"use client";

import { useEffect } from "react";

export default function CursorGlow() {
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) return;

    document.documentElement.classList.add("dp-custom-cursor");

    const dot = document.createElement("div");
    const ring = document.createElement("div");
    dot.className = "dp-cursor-dot";
    ring.className = "dp-cursor-ring";
    document.body.append(dot, ring);

    let tx = 0, ty = 0, rx = 0, ry = 0;
    let raf = 0;

    const move = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      dot.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    };

    const loop = () => {
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    const over = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, textarea, input, [tabindex]")) {
        document.documentElement.classList.add("dp-cursor-hover");
      }
    };

    const out = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, textarea, input, [tabindex]")) {
        document.documentElement.classList.remove("dp-cursor-hover");
      }
    };

    window.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseover", over, { passive: true });
    document.addEventListener("mouseout", out, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mouseout", out);
      dot.remove();
      ring.remove();
      document.documentElement.classList.remove("dp-custom-cursor", "dp-cursor-hover");
    };
  }, []);

  return null;
}
