"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function LandingMotion({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const media = gsap.matchMedia();
    const select = gsap.utils.selector(scope);
    const hero = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    hero
      .from("main > section:first-of-type h1", { y: 26, autoAlpha: 0, duration: 0.65 })
      .from("main > section:first-of-type p.border-l-2", { y: 18, autoAlpha: 0, duration: 0.48 }, "-=0.3")
      .from("main > section:first-of-type a", { y: 14, autoAlpha: 0, duration: 0.42, stagger: 0.06 }, "-=0.24");

    media.add("(prefers-reduced-motion: reduce)", () => {
      hero.progress(1).kill();
    });

    media.add("(prefers-reduced-motion: no-preference)", () => {
      hero.play(0);
      const image = select("main > section:first-of-type img")[0] as HTMLElement | undefined;
      const imageFrame = image?.parentElement;
      if (image && imageFrame) {
        gsap.fromTo(image, { scale: 1.015, yPercent: -1 }, {
          scale: 1.06,
          yPercent: 2,
          ease: "none",
          scrollTrigger: {
            trigger: imageFrame,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
          },
        });
      }
    });

    media.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const process = select("main > section:nth-of-type(5)")[0] as HTMLElement | undefined;
      const steps = select("main > section:nth-of-type(5) ol li") as HTMLElement[];
      if (!process || steps.length === 0) return;

      gsap.set(steps, { opacity: 0.46 });
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: process,
          start: "top top+=72",
          end: "+=620",
          scrub: 0.7,
          pin: true,
          anticipatePin: 1,
        },
      });
      timeline.to(steps[0], { opacity: 1, color: "#ffffff", duration: 0.35 });
      steps.slice(1).forEach((step, index) => {
        timeline.to(step, { opacity: 1, color: "#ffffff", duration: 0.35 }, ">-0.08");
        timeline.to(steps[index], { opacity: 0.46, duration: 0.35 }, "<");
      });
    });

    return () => media.revert();
  }, { scope });

  return <div ref={scope} className="contents">{children}</div>;
}
