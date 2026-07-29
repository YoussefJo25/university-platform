"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// بيلف أي section رئيسي في صفحات الموقع العامة (مش لوحة التحكم) بتأثير
// fade-up بسيط لما يدخل نطاق الرؤية. الـ observer بيعمل unobserve لنفسه
// أول ما العنصر يظهر مرة واحدة — مش محتاجين نفضل نراقبه بعد كده.
export default function ScrollReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`scroll-reveal ${isVisible ? "is-visible" : ""} ${className ?? ""}`}>
      {children}
    </div>
  );
}
