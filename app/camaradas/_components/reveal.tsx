"use client";

import { useEffect, useRef, useState } from "react";

export function Reveal({
  children,
  className = "",
  delay,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: 1 | 2 | 3;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    setReady(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      data-ready={ready ? "true" : undefined}
      data-visible={visible ? "true" : undefined}
      data-delay={delay}
    >
      {children}
    </div>
  );
}
