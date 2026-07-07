"use client";

import { FeatureSection } from "@/components/landing/featureSection";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { HeroSection } from "@/components/landing/heroSection";
import { InterestSection } from "@/components/landing/interestSection";
import { MatchSection } from "@/components/landing/matchSection";
import { useMotionValueEvent, useScroll } from "framer-motion";
import "lenis/dist/lenis.css";
import { ReactLenis } from "lenis/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import landingbg from "./../../public/landingbg.jpg";

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
    }
  }, []);

  const { scrollY } = useScroll();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const { scrollYProgress: globalScroll } = useScroll();

  const [isPastHero, setIsPastHero] = useState(false);
  const [showHeader, setShowHeader] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const pastHero = latest > 250;
    setIsPastHero(pastHero);

    const isAtBottom = globalScroll.get() > 0.9;
    setShowHeader(pastHero && !isAtBottom);
  });

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.07,
        smoothWheel: true,
        syncTouch: true,
        syncTouchLerp: 0.05,
      }}
    >
      <main className="dark relative w-full overflow-x-clip text-neutral-50 bg-neutral-950 font-sans selection:bg-primary selection:text-primary-foreground">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Image
            src={landingbg}
            alt="Matcha Background"
            fill
            priority
            sizes="100vw"
            className="object-cover"
            placeholder="blur"
          />
          <div className="absolute inset-0 backdrop-blur-sm" />
        </div>

        <Header isScrolled={showHeader} />

        <div
          ref={containerRef}
          className="relative h-[600svh] sm:h-[700svh] w-full z-10"
        >
          <div className="sticky top-0 h-svh w-full flex items-center justify-center overflow-hidden">
            <HeroSection scrollY={scrollY} isScrolled={isPastHero} />
            <InterestSection scrollYProgress={scrollYProgress} />
            <MatchSection scrollYProgress={scrollYProgress} />
            <FeatureSection scrollYProgress={scrollYProgress} />
          </div>
        </div>

        <Footer />
      </main>
    </ReactLenis>
  );
}
