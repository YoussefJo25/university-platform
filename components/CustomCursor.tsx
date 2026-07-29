"use client";

import { useEffect, useRef, useState } from "react";

// نقطة ذهبية بديلة للسهم الافتراضي — بتشتغل بس على الأجهزة اللي فيها
// ماوس حقيقي (hover: hover + pointer: fine)، فبتتعطّل تلقائيًا تمامًا على
// اللمس (موبايل/تابلت) عن طريق matchMedia هنا، وإخفاء السهم الافتراضي
// نفسه محصور بنفس الـ media query في globals.css.
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    setEnabled(mediaQuery.matches);

    function handleChange(event: MediaQueryListEvent) {
      setEnabled(event.matches);
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function handleMouseMove(event: MouseEvent) {
      if (!dotRef.current) return;
      dotRef.current.style.left = `${event.clientX}px`;
      dotRef.current.style.top = `${event.clientY}px`;
    }

    function handleMouseOver(event: MouseEvent) {
      const target = event.target as HTMLElement;
      setIsHoveringInteractive(
        !!target.closest('a, button, [role="button"], input, select, textarea, summary')
      );
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseover", handleMouseOver, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={dotRef}
      data-testid="custom-cursor-dot"
      aria-hidden="true"
      className={`pointer-events-none fixed top-0 left-0 z-[9999] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-light transition-[width,height,opacity] duration-150 ease-out ${
        isHoveringInteractive ? "h-6 w-6 opacity-60" : "h-2.5 w-2.5 opacity-80"
      }`}
    />
  );
}
