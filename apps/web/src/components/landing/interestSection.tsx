"use client";

import {
  motion,
  MotionValue,
  useMotionValueEvent,
  useTransform,
} from "framer-motion";
import {
  Camera,
  Code,
  Coffee,
  Dumbbell,
  Gamepad,
  Heart,
  Music,
  Palette,
  Pizza,
  Plane,
} from "lucide-react";
import { useState } from "react";

const interestsData = [
  { icon: Coffee, label: "Coffee Snobs" },
  { icon: Music, label: "Indie Rock" },
  { icon: Plane, label: "Backpacking" },
  { icon: Code, label: "Coding" },
  { icon: Camera, label: "Street Photography" },
  { icon: Dumbbell, label: "Weightlifting" },
  { icon: Pizza, label: "Foodies" },
  { icon: Palette, label: "Digital Art" },
  { icon: Gamepad, label: "Co-op Gaming" },
  { icon: Heart, label: "Deep Talks" },
];
const autoSelectedIndices = [0, 3, 5, 8, 9];

export function InterestSection({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const [showInterests, setShowInterests] = useState(false);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setShowInterests(latest > 0.11 && latest < 0.23);
  });

  const interestsOpacity = useTransform(
    scrollYProgress,
    [0.07, 0.11, 0.17, 0.2],
    [0, 1, 1, 0],
  );
  const interestsScale = useTransform(
    scrollYProgress,
    [0.07, 0.11, 0.17, 0.23],
    [0.8, 1, 1, 0.8],
  );

  return (
    <motion.section
      style={{ opacity: interestsOpacity, scale: interestsScale }}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
    >
      <div className="max-w-3xl w-full">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          Ditch the awkward bio.
        </h2>
        <p className="text-lg text-neutral-400 mb-10 text-balance max-w-xl mx-auto">
          Just pick your passions, and let your vibe do the talking.
        </p>
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-2xl mx-auto">
          {interestsData.map((interest, index) => {
            const isSelected = autoSelectedIndices.includes(index);
            const popDelay = 0.4 + autoSelectedIndices.indexOf(index) * 0.4;

            return (
              <motion.div
                key={interest.label}
                animate={
                  showInterests && isSelected
                    ? {
                        scale: [1, 1.15, 1],
                        opacity: 1,
                        backgroundColor: [
                          "rgba(255,255,255,0.05)",
                          "rgba(235,235,235,1)",
                          "rgba(235,235,235,1)",
                        ],
                        color: [
                          "rgba(212,212,212,1)",
                          "rgba(24,24,24,1)",
                          "rgba(24,24,24,1)",
                        ],
                        borderColor: [
                          "rgba(255,255,255,0.1)",
                          "rgba(235,235,235,1)",
                          "rgba(235,235,235,1)",
                        ],
                      }
                    : {
                        scale: 1,
                        opacity: 0.9,
                        backgroundColor: "rgba(255,255,255,0.05)",
                        color: "rgba(212,212,212,1)",
                        borderColor: "rgba(255,255,255,0.1)",
                      }
                }
                transition={{
                  delay: showInterests && isSelected ? popDelay : 0,
                  duration: showInterests && isSelected ? 0.5 : 0.2,
                  times: showInterests && isSelected ? [0, 0.5, 1] : undefined,
                  ease: "easeInOut",
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-full border text-sm md:text-base font-medium shadow-sm cursor-default"
              >
                <interest.icon className="size-4 md:size-5" /> {interest.label}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
