"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function DataHelix() {
  const ref = useRef<HTMLCanvasElement>(null);
  const path = usePathname();

  useEffect(() => {
    if (path !== "/" || !ref.current) return;
    const cv = ref.current;
    const ctx = cv.getContext("2d")!;
    let W = 0, H = 0, raf = 0;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener("resize", fit);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cards = Array.from({ length: 13 }, (_, i) => ({
      u: (i * 0.077) % 1, a: i * 2.4, hot: i % 5 === 2, sp: 0.02 + (i % 4) * 0.006,
      w: 96 + (i % 3) * 22, h: 46 + (i % 2) * 14,
    }));
    const dots = Array.from({ length: 80 }, (_, i) => ({
      x: (((i * 97) % 100) / 100) * 2 - 1, y: ((i * 53) % 100) / 100, v: 0.05 + ((i * 31) % 10) / 180, g: i % 4 === 0,
    }));
    const TURNS = 3 * Math.PI * 2;
    // parts of the page the helix should pass behind, and how strongly to hide it (0 to 1)
    const MASK = [".dp-nav", ".dp-hero-copy", ".dp-command", ".dp-metrics", ".dp-example", ".dp-process-face", ".dp-footer"];
    const ERASE = 0.92;

    const draw = (ms: number) => {
      const t = still ? 0 : ms / 1000;
      ctx.clearRect(0, 0, W, H);
      const cx = W > 800 ? W * 0.76 : W * 0.5;
      const R = Math.min(W * 0.13, 170);
      const ang = (y: number, off: number) => (y / H) * TURNS + t * 0.6 + off;

      // strands and rungs
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      const n = 80, step = (H + 40) / n;
      for (let s = 0; s < 2; s++) {
        for (let k = 0; k < n; k++) {
          const y0 = -20 + k * step, y1 = y0 + step;
          const a0 = ang(y0, s * Math.PI), a1 = ang(y1, s * Math.PI);
          const z = (Math.sin(a0) + Math.sin(a1)) / 2, d = (z + 1) / 2;
          const hue = 300 - 130 * Math.min(1, Math.max(0, y0 / H));
          ctx.strokeStyle = `hsla(${hue},90%,${58 + z * 10}%,${0.18 + 0.4 * d})`;
          ctx.lineWidth = 3 + 9 * d;
          ctx.beginPath();
          ctx.moveTo(cx + R * Math.cos(a0), y0);
          ctx.lineTo(cx + R * Math.cos(a1), y1);
          ctx.stroke();
          if (s === 0 && k % 4 === 0) {
            ctx.strokeStyle = `hsla(${hue},80%,70%,0.12)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx + R * Math.cos(a0), y0);
            ctx.lineTo(cx + R * Math.cos(a0 + Math.PI), y0);
            ctx.stroke();
          }
        }
      }

      // falling data particles
      for (const d of dots) {
        const y = ((d.y + t * d.v) % 1) * H;
        ctx.fillStyle = d.g ? "rgba(251,191,36,.75)" : "rgba(110,220,255,.55)";
        ctx.fillRect(cx + d.x * R * 2, y, 1.6, d.g ? 9 : 6);
      }

      // floating glass data cards, back to front
      ctx.globalCompositeOperation = "source-over";
      const list = cards.map((c) => {
        const y = ((c.u + t * c.sp) % 1) * H;
        const a = ang(y, c.a);
        return { c, y, x: cx + R * 1.35 * Math.cos(a), z: Math.sin(a) };
      }).sort((p, q) => p.z - q.z);
      for (const { c, x, y, z } of list) {
        const d = (z + 1) / 2, sc = 0.65 + 0.4 * d, w = c.w * sc, h = c.h * sc;
        ctx.globalAlpha = 0.3 + 0.65 * d;
        ctx.fillStyle = c.hot ? "rgba(70,35,45,.55)" : "rgba(20,45,90,.45)";
        ctx.strokeStyle = c.hot ? "rgba(251,191,36,.9)" : "rgba(110,200,255,.7)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - h / 2, w, h, 7 * sc);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = c.hot ? "rgba(249,168,212,.55)" : "rgba(180,220,255,.5)";
        for (let l = 0; l < 4; l++) ctx.fillRect(x - w / 2 + 10 * sc, y - h / 2 + (9 + l * 8) * sc, (w - 20 * sc) * (1 - l * 0.14), 2 * sc);
        if (c.hot) {
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(x - w / 2 + 8 * sc, y - h / 2 + 8 * sc, 4.5 * sc, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // pass behind the page content: fade the helix out under these elements
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${ERASE})`;
      ctx.shadowColor = "rgba(0,0,0,1)";
      ctx.shadowBlur = 26;
      for (const sel of MASK) {
        document.querySelectorAll(sel).forEach((el) => {
          const b = el.getBoundingClientRect();
          if (b.bottom < 0 || b.top > H || b.width === 0) return;
          ctx.beginPath();
          ctx.roundRect(b.left, b.top, b.width, b.height, 18);
          ctx.fill();
        });
      }
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "source-over";
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", fit); };
  }, [path]);

  if (path !== "/") return null;
  return <canvas ref={ref} className="dp-helix" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: -1, pointerEvents: "none", opacity: 0.85 }} />;
}
