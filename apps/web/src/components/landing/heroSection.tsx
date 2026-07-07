"use client";

import { AnimatedMatchaIcon } from "@/components/shared/animatedMatchaIcon";
import { Button } from "@matcha/ui/components/button";
import { motion, MotionValue, Transition, useTransform } from "framer-motion";
import Link from "next/link";

const smoothTransition: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 20,
  mass: 0.8,
};

export function HeroSection({
  scrollY,
  isScrolled,
}: {
  scrollY: MotionValue<number>;
  isScrolled: boolean;
}) {
  const heroY = useTransform(scrollY, [0, 250], [0, -110]);
  const fadeOutOpacity = useTransform(scrollY, [120, 250], [1, 0]);

  return (
    <motion.section
      style={{ y: heroY }}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none z-50"
    >
      {!isScrolled && (
        <>
          <motion.div
            layoutId="matcha-icon"
            transition={smoothTransition}
            className="mb-2"
          >
            <AnimatedMatchaIcon className="size-32 md:size-44 text-primary drop-shadow-2xl" />
          </motion.div>
          <motion.h1
            layoutId="matcha-title"
            transition={smoothTransition}
            className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-4"
          >
            Stop swiping. Meet Matcha.
          </motion.h1>
          <motion.p
            style={{ opacity: fadeOutOpacity }}
            className="text-md sm:text-lg md:text-xl text-neutral-300 max-w-2xl text-balance mb-8"
          >
            Skip the ghosting. Drop into live chats with people who share your
            energy.
          </motion.p>

          <motion.div
            layoutId="matcha-buttons"
            transition={smoothTransition}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pointer-events-auto"
          >
            <Button
              size="lg"
              className="w-60 sm:w-auto rounded-full h-14 text-lg font-semibold shadow-xl hover:bg-white/75"
              asChild
            >
              <Link href="/signup">Drop In</Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="w-60 sm:w-auto rounded-full h-14 text-lg text-white hover:bg-white/70 shadow-xl"
              asChild
            >
              <Link href="/login">I have an account</Link>
            </Button>
          </motion.div>
        </>
      )}
    </motion.section>
  );
}
