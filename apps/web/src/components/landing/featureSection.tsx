"use client";

import { AnimatedMatchaIcon } from "@/components/shared/animatedMatchaIcon";
import { motion, MotionValue, useTransform } from "framer-motion";
import {
  AlarmClock,
  ChevronLeft,
  Clock,
  FastForward,
  HelpCircle,
  Send,
  UserPlus,
} from "lucide-react";

export function FeatureSection({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const sec4Opacity = useTransform(
    scrollYProgress,
    [0.73, 0.77, 1],
    [0, 1, 1],
    { clamp: true },
  );
  const sec4Scale = useTransform(
    scrollYProgress,
    [0.73, 0.77, 1],
    [0.9, 1, 1],
    { clamp: true },
  );

  const card1Opacity = useTransform(
    scrollYProgress,
    [0.77, 0.81, 1],
    [0, 1, 1],
    { clamp: true },
  );
  const card1Y = useTransform(scrollYProgress, [0.77, 0.81, 1], [20, 0, 0], {
    clamp: true,
  });

  const popoverOpacity = useTransform(
    scrollYProgress,
    [0.82, 0.84, 1],
    [1, 0, 0],
    { clamp: true },
  );
  const popoverScale = useTransform(
    scrollYProgress,
    [0.82, 0.84, 1],
    [1, 0.9, 0.9],
    { clamp: true },
  );
  const popoverVisibility = useTransform(scrollYProgress, (val) =>
    val >= 0.84 ? "hidden" : "visible",
  );

  const myMsgOpacity = useTransform(
    scrollYProgress,
    [0.84, 0.86, 1],
    [0, 1, 1],
    { clamp: true },
  );
  const myMsgY = useTransform(
    scrollYProgress,
    [0.84, 0.86, 0.89, 0.92, 1],
    [20, 0, 0, -72, -72],
    { clamp: true },
  );

  const card2Opacity = useTransform(
    scrollYProgress,
    [0.84, 0.87, 1],
    [0, 1, 1],
    { clamp: true },
  );
  const card2Y = useTransform(scrollYProgress, [0.84, 0.87, 1], [20, 0, 0], {
    clamp: true,
  });

  const typingOpacity = useTransform(
    scrollYProgress,
    [0.85, 0.86, 0.89, 0.91, 1],
    [0, 1, 1, 0, 0],
    { clamp: true },
  );
  const typingVisibility = useTransform(scrollYProgress, (val) =>
    val >= 0.91 ? "hidden" : "visible",
  );

  const theirMsgOpacity = useTransform(
    scrollYProgress,
    [0.9, 0.93, 1],
    [0, 1, 1],
    { clamp: true },
  );
  const theirMsgY = useTransform(scrollYProgress, [0.9, 0.93, 1], [20, 0, 0], {
    clamp: true,
  });

  const card3Opacity = useTransform(
    scrollYProgress,
    [0.9, 0.93, 1],
    [0, 1, 1],
    { clamp: true },
  );
  const card3Y = useTransform(scrollYProgress, [0.9, 0.93, 1], [20, 0, 0], {
    clamp: true,
  });

  const card4Opacity = useTransform(
    scrollYProgress,
    [0.95, 0.98, 1],
    [0, 1, 1],
    { clamp: true },
  );
  const card4Y = useTransform(scrollYProgress, [0.95, 0.98, 1], [20, 0, 0], {
    clamp: true,
  });

  return (
    <motion.section
      style={{ opacity: sec4Opacity, scale: sec4Scale, z: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center px-6 pt-21 pb-4 pointer-events-none"
    >
      <div className="mb-5 text-center z-30 shrink-0">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight">
          Kill the Small Talk
        </h2>
        <p className="text-base md:text-lg text-neutral-400 max-w-2xl mx-auto sm:whitespace-nowrap">
          Five minutes on the clock. Skip the &quot;hey&quot; and get straight
          to the good stuff.
        </p>
      </div>

      <div className="relative w-full max-w-[320px] h-140 rounded-[2.0rem] border-6 border-neutral-800/95 bg-neutral-950 shadow-2xl flex flex-col z-20 overflow-visible">
        <div
          className="absolute inset-0 z-0 opacity-10 rounded-[2rem] overflow-hidden"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute inset-0 z-1 h-full w-full backdrop-blur-[2px] rounded-[2rem] overflow-hidden" />

        <header className="flex h-14 shrink-0 items-center border-b border-white/10 bg-neutral-950/95 backdrop-blur-md px-3 z-30 relative rounded-t-[2rem]">
          <ChevronLeft className="size-5 text-neutral-400 mr-2" />
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center overflow-hidden">
              <AnimatedMatchaIcon className="size-6 text-primary" />
            </div>

            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-none text-white">
                Bojack
              </span>

              <motion.div
                style={{ opacity: typingOpacity, visibility: typingVisibility }}
                className="flex items-center gap-1"
              >
                <span className="text-[10px] font-medium text-primary tracking-wide">
                  typing
                </span>
                <div className="flex gap-0.5 mt-1">
                  <span
                    className="size-1 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="size-1 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="size-1 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </header>

        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-[75%] flex items-center justify-between rounded-full border border-white/10 bg-neutral-950/90 backdrop-blur-md p-1.5 shadow-xl">
          <div className="flex items-center gap-2 h-8 p-3 rounded-full bg-white/5 text-xs font-medium">
            <Clock className="size-3.5 text-primary" />
            <span className="text-white tabular-nums">04:59</span>
          </div>

          <div className="flex items-center gap-1">
            <div className="size-8 rounded-full flex items-center justify-center text-neutral-300 shadow-sm">
              <AlarmClock className="size-4" />
            </div>
            <div className="size-8 rounded-full flex items-center justify-center text-primary shadow-sm">
              <UserPlus className="size-4" />
            </div>
            <div className="flex items-center text-white/80 text-[12px] px-2 border-l border-white/10">
              Skip <FastForward className="size-3 ml-1" />
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-1 w-full p-4 overflow-hidden">
          <motion.div
            style={{ opacity: myMsgOpacity, y: myMsgY }}
            className="absolute bottom-3 right-4 w-[calc(100%-2rem)] flex justify-end"
          >
            <div className="max-w-[85%] px-3 py-2 text-sm shadow-sm flex items-end gap-2 bg-primary text-primary-foreground rounded-2xl rounded-br-sm font-medium">
              <span className="leading-relaxed">
                Spaces obviously. 4 plates on the bar, 4 spaces per indent.
              </span>
            </div>
          </motion.div>

          <motion.div
            style={{ opacity: theirMsgOpacity, y: theirMsgY }}
            className="absolute bottom-3 left-4 w-[calc(100%-2rem)] flex justify-start"
          >
            <div className="max-w-[85%] px-3 py-2 text-sm shadow-sm bg-neutral-900 border border-white/10 text-neutral-100 rounded-2xl rounded-bl-sm">
              <span className="leading-relaxed">
                Haha respect. I'm a tabs guy but I'll let it slide.
              </span>
            </div>
          </motion.div>
        </div>

        <div className="px-3 pb-4 shrink-0 relative z-20">
          <motion.div
            style={{
              opacity: popoverOpacity,
              scale: popoverScale,
              visibility: popoverVisibility,
              transformOrigin: "bottom right",
            }}
            className="absolute -top-20 right-12 w-56 p-2 rounded-2xl bg-neutral-800 text-xs shadow-2xl border border-white/10 z-50"
          >
            <span className="font-semibold text-white block">
              Bojack asked:
            </span>
            <p className="italic text-neutral-300 mt-1 text-pretty leading-relaxed">
              &quot;You love coding &amp; weightlifting. Tabs or spaces between
              sets?&quot;
            </p>
            <div className="absolute -bottom-2 right-6 size-4 bg-neutral-800 border-b border-r border-white/10 rotate-45" />
          </motion.div>

          <div className="flex items-end gap-2 w-full bg-neutral-900/20 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-1">
            <div className="relative flex-1 flex items-center h-10 px-3 text-neutral-500 text-xs">
              Type a message...
              <div className="absolute right-1 top-1/2 -translate-y-1/2 size-7 rounded-lg bg-white/5 flex items-center justify-center text-white">
                <HelpCircle className="size-4" />
              </div>
            </div>
            <div className="size-10 shrink-0 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Send className="size-4 translate-y-0.5 -translate-x-0.5" />
            </div>
          </div>
        </div>

        <motion.div
          style={{ opacity: card1Opacity, y: card1Y }}
          className="absolute top-35 md:top-auto md:bottom-20 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-[105%] z-50 w-48 lg:w-56 p-3 lg:p-4 rounded-2xl bg-neutral-950/95 md:bg-white/5 backdrop-blur-2xl md:backdrop-blur-sm border border-white/10 md:border-white/20 shadow-2xl md:shadow-xl"
        >
          <div className="text-xs lg:text-sm font-bold text-white mb-1">
            No More &quot;Hey&quot;
          </div>
          <div className="text-[10px] lg:text-xs text-neutral-300">
            See their opening question right in the chat.
          </div>
        </motion.div>

        <motion.div
          style={{ opacity: card2Opacity, y: card2Y }}
          className="absolute top-35 md:top-18 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-[105%] z-50 w-48 lg:w-56 p-3 lg:p-4 rounded-2xl bg-neutral-950/95 md:bg-white/5 backdrop-blur-2xl md:backdrop-blur-sm border border-white/10 md:border-white/20 shadow-2xl md:shadow-xl"
        >
          <div className="text-xs lg:text-sm font-bold text-white mb-1">
            5 Minutes to Click
          </div>
          <div className="text-[10px] lg:text-xs text-neutral-300">
            Every chat has a timer. It forces the vibe and kills the ghosting.
          </div>
        </motion.div>

        <motion.div
          style={{ opacity: card3Opacity, y: card3Y }}
          className="absolute top-35 md:top-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[105%] z-50 w-48 lg:w-56 p-3 lg:p-4 rounded-2xl bg-neutral-950/95 md:bg-white/5 backdrop-blur-2xl md:backdrop-blur-sm border border-white/10 md:border-white/20 shadow-2xl md:shadow-xl"
        >
          <div className="text-xs lg:text-sm font-bold text-white mb-1">
            Not Ready to Go?
          </div>
          <div className="text-[10px] lg:text-xs text-neutral-300">
            Add them as a friend or hit extend to keep the conversation flowing.
          </div>
        </motion.div>

        <motion.div
          style={{ opacity: card4Opacity, y: card4Y }}
          className="absolute top-35 md:top-auto md:bottom-20 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[105%] z-50 w-48 lg:w-56 p-3 lg:p-4 rounded-2xl bg-neutral-950/95 md:bg-white/5 backdrop-blur-2xl md:backdrop-blur-sm border border-white/10 md:border-white/20 shadow-2xl md:shadow-xl"
        >
          <div className="text-xs lg:text-sm font-bold text-white mb-1">
            The "What If" Archive
          </div>
          <div className="text-[10px] lg:text-xs text-neutral-300">
            Ran out of time? Find your missed connections waiting here for 5
            days.
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
