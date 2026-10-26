"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./home.module.css";

/** Two local pointer handlers; no render loop, global mouse listener or WebGL. */
export function DepthSurface({ children, className = "", decorative = false }: {
  children: ReactNode; className?: string; decorative?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useRef(false);
  const frame = useRef<number | null>(null);
  useEffect(() => {
    const preference = matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const update = () => {
      enabled.current = preference.matches;
      if (!preference.matches) {
        ref.current?.style.setProperty("--tilt-x", "0deg");
        ref.current?.style.setProperty("--tilt-y", "0deg");
      }
    };
    update();
    preference.addEventListener("change", update);
    return () => {
      preference.removeEventListener("change", update);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);
  useEffect(() => {
    const element = ref.current;
    if (decorative || !element) return;
    let animation: Animation | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // Content is visible without JavaScript; reveal never blocks reading or focus.
        animation = element.animate([
          { opacity: 0.85, translate: "0 12px" },
          { opacity: 1, translate: "0 0" },
        ], { duration: 600, easing: "cubic-bezier(.16, 1, .3, 1)" });
      }
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(element);
    return () => { observer.disconnect(); animation?.cancel(); };
  }, [decorative]);
  return (
    <div ref={ref} className={`${styles.depthSurface} ${className}`} aria-hidden={decorative || undefined}
      onPointerMove={(event) => {
        if (!enabled.current || event.pointerType !== "mouse") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 7;
        const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -7;
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          ref.current?.style.setProperty("--tilt-x", `${y.toFixed(2)}deg`);
          ref.current?.style.setProperty("--tilt-y", `${x.toFixed(2)}deg`);
        });
      }}
      onPointerLeave={() => {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        ref.current?.style.setProperty("--tilt-x", "0deg");
        ref.current?.style.setProperty("--tilt-y", "0deg");
      }}>
      <div className={styles.depthPlane}>{children}</div>
    </div>
  );
}
