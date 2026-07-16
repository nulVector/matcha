"use client";

import { AnimatedMatchaIcon } from "@/components/shared/animatedMatchaIcon";
import { motion, MotionValue, useTransform } from "framer-motion";
import { Code, Dumbbell, Music, Plane } from "lucide-react";

export function MatchSection({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const p1Opacity = useTransform(
    scrollYProgress,
    [0.22, 0.26, 0.37, 0.4],
    [0, 1, 1, 0],
  );
  const p1Y = useTransform(scrollYProgress, [0.22, 0.26], [50, 0]);

  const btnScale = useTransform(
    scrollYProgress,
    [0.28, 0.32, 0.35],
    [1, 0.9, 1],
  );
  const btnBg = useTransform(
    scrollYProgress,
    [0.32, 0.33],
    ["rgba(255,255,255,0.05)", "rgba(235,235,235,1)"],
  );
  const btnText = useTransform(
    scrollYProgress,
    [0.32, 0.33],
    ["rgba(255,255,255,1)", "rgba(24,24,24,1)"],
  );

  const p2Opacity = useTransform(
    scrollYProgress,
    [0.42, 0.45, 0.53, 0.57],
    [0, 1, 1, 0],
  );

  const p3Opacity = useTransform(
    scrollYProgress,
    [0.59, 0.63, 0.66, 0.71],
    [0, 1, 1, 0],
  );
  const p3Scale = useTransform(
    scrollYProgress,
    [0.59, 0.63, 0.66, 0.71],
    [0.5, 1, 1, 0.8],
  );

  return (
    <>
      <motion.section
        style={{ opacity: p1Opacity, y: p1Y }}
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
      >
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          Step into The Blend.
        </h2>
        <p className="text-lg text-neutral-400 mb-10 text-balance max-w-lg mx-auto">
          Instantly drop into a room with someone on your exact wavelength. No
          swiping, just talking.
        </p>
        <motion.div
          style={{ scale: btnScale, backgroundColor: btnBg, color: btnText }}
          className="flex items-center justify-center px-8 py-4 rounded-full border border-white/20 font-semibold text-lg backdrop-blur-md shadow-xl"
        >
          Find my crowd
        </motion.div>
      </motion.section>

      <motion.section
        style={{ opacity: p2Opacity }}
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
      >
        <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
          <motion.div
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: [1, 4.5], opacity: [0, 0.6, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              times: [0, 0.1, 1],
              ease: "easeOut",
              delay: 0,
            }}
            className="absolute size-24 rounded-full bg-primary/20 border border-primary/20"
          />
          <motion.div
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: [1, 4.5], opacity: [0, 0.6, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              times: [0, 0.1, 1],
              ease: "easeOut",
              delay: 1,
            }}
            className="absolute size-24 rounded-full bg-primary/20 border border-primary/20"
          />
          <motion.div
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: [1, 4.5], opacity: [0, 0.6, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              times: [0, 0.1, 1],
              ease: "easeOut",
              delay: 2,
            }}
            className="absolute size-24 rounded-full bg-primary/20 border border-primary/20"
          />

          <div className="relative size-26 rounded-full bg-neutral-950/50 backdrop-blur-md border border-white/10 flex items-center justify-center z-10 shadow-[0_0_40px] shadow-primary/10">
            <div className="size-4 bg-primary rounded-full shadow-[0_0_20px_var(--color-primary)] animate-pulse" />
          </div>

          <motion.div
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="absolute top-[20%] left-[25%] size-2.5 bg-white/80 rounded-full shadow-[0_0_10px_white]"
          />
          <motion.div
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2.5,
            }}
            className="absolute bottom-[25%] right-[20%] size-2 bg-white/60 rounded-full shadow-[0_0_10px_white]"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <h3 className="text-3xl font-bold text-white tracking-tight drop-shadow-md mb-2">
            Brewing your match...
          </h3>
          <p className="text-lg text-neutral-400">
            Looking for someone to match your energy
          </p>
        </div>
      </motion.section>

      <motion.section
        style={{ opacity: p3Opacity, scale: p3Scale }}
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
      >
        <div className="relative flex flex-col items-center">
          <div className="absolute -top-18 whitespace-nowrap px-6 py-2 rounded-full bg-white text-neutral-950 font-bold text-sm tracking-widest uppercase shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            Match Found
          </div>
          <div className="size-32 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center shadow-2xl relative z-20">
            <AnimatedMatchaIcon className="size-22 text-primary" />
          </div>
          <div className="absolute top-2 -left-26 sm:-left-30 flex items-center gap-2 px-4 py-2 rounded-full bg-white text-neutral-950 font-medium text-sm shadow-xl z-30">
            <Code className="size-4" /> Coding
          </div>
          <div className="absolute -bottom-6 -right-28 sm:-right-34 flex items-center gap-2 px-4 py-2 rounded-full bg-white text-neutral-950 font-medium text-sm shadow-xl z-30">
            <Dumbbell className="size-4" /> Weightlifting
          </div>
          <div className="absolute -top-4 -right-28 sm:-right-32 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-neutral-200 font-medium text-sm backdrop-blur-sm z-10">
            <Music className="size-4" /> Indie Rock
          </div>
          <div className="absolute -bottom-8 -left-26 sm:-left-34 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-neutral-200 font-medium text-sm backdrop-blur-sm z-10">
            <Plane className="size-4" /> Backpacking
          </div>
        </div>
      </motion.section>
    </>
  );
}
