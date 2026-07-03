"use client";

import { Doodle } from "@/components/shared/doodle";
import { MatchaChatIcon } from "@/components/shared/icons";
import { cn } from "@matcha/ui/lib/utils";
import { motion, Transition, Variants } from "framer-motion";
import { useEffect, useState } from "react";

const bubbleVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 15 },
  animate: { opacity: 1, scale: 1, y: 0 },
};

const springTransition: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export default function HomeEmptyState() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 200);
    const timer2 = setTimeout(() => setStep(2), 800);
    const timer3 = setTimeout(() => setStep(3), 1400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <svg className="h-full w-full">
          <defs>
            <pattern
              id="doodle-bg"
              width="894"
              height="590"
              patternUnits="userSpaceOnUse"
              patternTransform="scale(0.6)"
            >
              <Doodle className="text-foreground/15 dark:text-muted-foreground/15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#doodle-bg)" />
        </svg>
      </div>
      <div className="absolute inset-0 z-1 h-full w-full backdrop-blur-[2px] pointer-events-none" />
      <motion.div className="relative z-20 w-full max-w-xl -mt-10">
        <div className="flex flex-col justify-end gap-1.5 w-full min-h-35">
          {step >= 2 && (
            <motion.div
              layout
              variants={bubbleVariants}
              initial="initial"
              animate="animate"
              transition={springTransition}
              className={cn(
                "max-w-[90%] px-5 py-3 text-md shadow-sm",
                "border border-border/50 bg-primary/95 dark:bg-primary text-primary-foreground origin-bottom-left",
                step >= 3 ? "rounded-2xl" : "rounded-2xl rounded-br-sm",
              )}
            >
              <span className="whitespace-pre-wrap leading-relaxed font-semibold">
                Welcome to Matcha
              </span>
            </motion.div>
          )}

          {step >= 3 && (
            <motion.div
              layout
              variants={bubbleVariants}
              initial="initial"
              animate="animate"
              transition={springTransition}
              className={cn(
                "max-w-[90%] px-5 py-3 text-md shadow-sm",
                "border border-border/50 bg-primary/95 dark:bg-primary text-primary-foreground rounded-2xl rounded-br-sm origin-bottom-left",
              )}
            >
              <span className="whitespace-pre-wrap leading-relaxed font-semibold">
                Jump back into your chats, or step into The Blend to discover
                who shares your interests nearby.
              </span>
            </motion.div>
          )}
        </div>

        <div className="flex justify-end mt-2">
          {step >= 1 && (
            <motion.div
              layout
              variants={bubbleVariants}
              initial="initial"
              animate="animate"
              transition={springTransition}
              className="relative flex size-18 shrink-0 items-center justify-center rounded-full bg-muted/70 shadow-sm border border-border/50 overflow-hidden"
            >
              <MatchaChatIcon className="w-[70%]" />
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
