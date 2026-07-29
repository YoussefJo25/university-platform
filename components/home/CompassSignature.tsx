"use client";

import { useEffect, useRef } from "react";

// عنصر بصري تفاعلي (بوصلة/أسطرلاب) — الإبرة بتتبع حركة الماوس داخل حدود
// القسم كله (مش بس مساحة الـ SVG نفسها)، لأن الـ wrapper هنا بيتمدد
// بالكامل فوق القسم (`absolute inset-0`) عن طريق الأب اللي بيستدعي
// الكومبوننت ده جوا `position: relative`. الزاوية بتتحسب بين مركز
// القسم (اللي بيساوي مركز الـ wrapper هنا لأنه بنفس حجم القسم) وموضع
// الماوس عبر Math.atan2.
//
// على الأجهزة اللي مفيهاش ماوس حقيقي (`hover: none`)، بنستبدل التتبع
// بتمايل تلقائي بسيط (كلاس CSS + keyframes في globals.css) بدل ما نسيب
// الإبرة ثابتة أو نحاول نتابع touch events اللي مفيهاش معنى فعلي هنا.
export default function CompassSignature() {
  const needleRef = useRef<SVGGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRealMouseRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    hasRealMouseRef.current = mediaQuery.matches;

    function updateFromQuery(event: MediaQueryListEvent) {
      hasRealMouseRef.current = event.matches;
    }
    mediaQuery.addEventListener("change", updateFromQuery);

    function handleMouseMove(event: MouseEvent) {
      if (!hasRealMouseRef.current || !containerRef.current || !needleRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angleRad = Math.atan2(event.clientY - centerY, event.clientX - centerX);
      const angleDeg = (angleRad * 180) / Math.PI + 90;

      needleRef.current.style.transform = `rotate(${angleDeg}deg)`;
    }

    const container = containerRef.current;
    container?.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      mediaQuery.removeEventListener("change", updateFromQuery);
      container?.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="pointer-events-auto absolute inset-0" aria-hidden="true">
      <div className="absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 sm:h-72 sm:w-72">
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <circle cx="100" cy="100" r="92" fill="none" stroke="var(--gold)" strokeOpacity="0.25" strokeWidth="1" />
          <circle cx="100" cy="100" r="72" fill="none" stroke="var(--gold)" strokeOpacity="0.15" strokeWidth="1" />

          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const outer = 92;
            const inner = i % 2 === 0 ? 76 : 84;
            const x1 = 100 + Math.sin(angle) * outer;
            const y1 = 100 - Math.cos(angle) * outer;
            const x2 = 100 + Math.sin(angle) * inner;
            const y2 = 100 - Math.cos(angle) * inner;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--gold)"
                strokeOpacity="0.4"
                strokeWidth="1.5"
              />
            );
          })}

          <g
            ref={needleRef}
            className="compass-needle"
            style={{ transformOrigin: "100px 100px", transition: "transform 0.4s ease-out" }}
          >
            <polygon points="100,24 110,100 100,108 90,100" fill="var(--gold-light)" />
            <polygon points="100,176 90,100 100,92 110,100" fill="var(--muted)" />
            <circle cx="100" cy="100" r="6" fill="var(--gold-light)" stroke="var(--canvas)" strokeWidth="1.5" />
          </g>
        </svg>
      </div>
    </div>
  );
}
