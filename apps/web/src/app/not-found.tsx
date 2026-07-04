"use client";

import { CryingMatchaIcon } from "@/components/shared/icons";
import { Button } from "@matcha/ui/components/button";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: -100, y: 100 }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        transition={{ type: "spring", duration: 1, bounce: 0.3 }}
        className="absolute -bottom-10 -left-5 z-0"
      >
        <CryingMatchaIcon className="size-90 lg:size-120 -translate-x-8.75 translate-y-8.75" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <h1 className="text-7xl lg:text-9xl font-bold tracking-tighter text-primary drop-shadow-sm">
          404
        </h1>
        <p className="max-w-md text-base md:text-lg text-muted-foreground text-balance mb-4">
          We couldn&apos;t find the page you&apos;re looking for.
        </p>

        <Button
          asChild
          size="lg"
          className="rounded-xl lg:h-12 text-base shadow-lg transition-all"
        >
          <Link href="/home">
            <ChevronLeft className="size-5" />
            Back to Home
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
