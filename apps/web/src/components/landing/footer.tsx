"use client";

import { CryingMatchaIcon } from "@/components/shared/icons";
import { Button } from "@matcha/ui/components/button";
import { motion } from "framer-motion";
import Link from "next/link";

export function Footer() {
  return (
    <section className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-neutral-950 border-t border-white/5 z-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: -100, y: 100 }}
        whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        viewport={{ once: true, margin: "100px" }}
        transition={{ type: "spring", duration: 1.2, bounce: 0.3 }}
        className="absolute -bottom-10 -left-5 z-0 pointer-events-none opacity-50"
      >
        <CryingMatchaIcon className=" size-84 sm:size-88 lg:size-120 -translate-x-8.75 translate-y-8.75 text-white/20" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center px-6 -mt-20 "
      >
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tighter text-white mb-4 drop-shadow-sm">
          Don&apos;t leave us hanging...
        </h2>
        <p className="max-w-2xl text-md sm:text-lg md:text-2xl text-neutral-400 text-balance mb-8">
          Someone nearby is probably geeking out over the exact same things you are. Stop scrolling, go find them.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Button
            size="lg"
            className="w-auto sm:min-w-56 px-4 rounded-full h-16 text-lg sm:text-xl font-bold shadow-[0_0_40px_rgba(var(--color-primary),0.3)] hover:shadow-[0_0_60px_rgba(var(--color-primary),0.5)] transition-shadow duration-300"
            asChild
          >
            <Link href="/signup">Drop into The Blend</Link>
          </Button>

          <Button
            size="lg"
            variant="ghost"
            className="w-auto px-4 rounded-full h-16 text-lg sm:text-xl text-white hover:bg-white/10"
            asChild
          >
            <Link href="/login">I already have an account</Link>
          </Button>
        </div>
      </motion.div>

      <div className="absolute bottom-8 w-full flex justify-center gap-6 text-neutral-500 text-sm z-10">
        <Link href="/privacy" className="hover:text-neutral-300 transition-colors">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-neutral-300 transition-colors">
          Terms
        </Link>
        <Link href="/contact" className="hover:text-neutral-300 transition-colors">
          Contact
        </Link>
      </div>
    </section>
  );
}
