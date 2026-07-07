"use client";

import { AnimatedMatchaIcon } from "@/components/shared/animatedMatchaIcon";
import { Button } from "@matcha/ui/components/button";
import { motion, Transition } from "framer-motion";
import Link from "next/link";

const smoothTransition: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 20,
  mass: 0.8,
};

export function Header({ isScrolled }: { isScrolled: boolean }) {
  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 lg:px-8 py-2 md:py-3 bg-neutral-950/60 border-b border-white/10 shadow-xl"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: isScrolled ? 1 : 0, y: isScrolled ? 0 : -20 }}
      transition={{ duration: 0.3 }}
      style={{ pointerEvents: isScrolled ? "auto" : "none" }}
    >
      <div className="flex items-center gap-3 md:gap-4">
        {isScrolled && (
          <>
            <motion.div layoutId="matcha-icon" transition={smoothTransition}>
              <AnimatedMatchaIcon className="size-10 md:size-12 text-primary" />
            </motion.div>
            <motion.h1
              layoutId="matcha-title"
              transition={smoothTransition}
              className="text-2xl md:text-3xl font-bold tracking-tight text-white"
            >
              Matcha
            </motion.h1>
          </>
        )}
      </div>
      <div className="flex items-center">
        {isScrolled && (
          <motion.div
            layoutId="matcha-buttons"
            transition={smoothTransition}
            className="flex items-center gap-2 md:gap-3"
          >
            <Button
              className="rounded-full font-semibold text-sm md:text-base px-2 sm:px-4 md:px-6 h-7 md:h-10 shadow-lg"
              asChild
            >
              <Link href="/signup">Signup</Link>
            </Button>
            <Button
              className="rounded-full font-semibold text-sm md:text-base px-2 sm:px-4 md:px-6 h-7 md:h-10 shadow-lg"
              asChild
            >
              <Link href="/login">Log in</Link>
            </Button>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}
