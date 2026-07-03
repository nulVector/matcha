"use client";

import { cn } from "@matcha/ui/lib/utils";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

export function MagneticEye({ className }: { className?: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX - window.innerWidth / 2;
      const y = e.clientY - window.innerHeight / 2;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const springConfig = { damping: 20, stiffness: 150, mass: 0.5 };

  const eyeX = useSpring(
    useTransform(mouseX, [-500, 500], [250, 330]),
    springConfig,
  );
  const eyeY = useSpring(
    useTransform(mouseY, [-500, 500], [40, 120]),
    springConfig,
  );

  return (
    <div className={cn("flex items-end", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 456 361"
        fill="none"
        className="w-full"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M455.601 246.55C455.601 312.134 421.834 361 356.25 361H118.75C53.1663 361 0 307.834 0 242.25L0 140C51.1898 44.1564 146.119 0 237.5 0C358.9 0 422.721 63.631 455.601 246.55Z"
          fill="black"
        />

        <motion.g style={{ x: eyeX, y: eyeY }}>
          <motion.g
            style={{ originY: 0.5 }}
            animate={{ scaleY: [1, 1, 0, 1] }}
            transition={{
              duration: 3,
              times: [0, 0.95, 0.98, 1],
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <path
              d="M109.329 0C102.091 0 95.5781 1.54091 89.9811 4.57854C84.4179 7.59859 79.6708 11.9353 75.8794 17.4601C72.1967 22.8356 69.4042 29.326 67.5854 36.7474C65.8136 43.986 64.9135 52.1825 64.9135 61.1097V101.276C64.914 103.854 67.0101 105.947 69.5894 105.947H109.329C111.907 105.947 114 103.853 114 101.276V61.1097C114 58.5314 111.908 56.439 109.329 56.4386H94.6338C95.3168 37.8057 100.253 28.3656 109.329 28.3656C111.907 28.3651 114 26.2718 114 23.6944V4.67114C114 2.09142 111.908 0.000475 109.329 0ZM44.4153 0C37.1744 0 30.6622 1.54044 25.0629 4.57854C19.5006 7.59859 14.7568 11.9353 10.9659 17.4601C7.28175 22.8356 4.49018 29.3232 2.67188 36.7431C0.8987 43.9793 0 52.1773 0 61.1097V101.276C0.000475 103.853 2.09047 105.943 4.67114 105.943H44.4106C46.9903 105.943 49.0813 103.854 49.0818 101.276V61.1097C49.0818 58.5309 46.9908 56.4386 44.4106 56.4386H29.5065C30.2005 37.8067 35.207 28.3665 44.4106 28.3656C46.9903 28.3656 49.0813 26.2737 49.0818 23.6944V4.67114C49.0818 2.09142 46.9932 0.000475 44.4153 0Z"
              fill="white"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M89.9811 4.57854C95.5781 1.54091 102.091 0 109.329 0C111.908 0.000475 114 2.09142 114 4.67114V23.6944C114 26.2718 111.907 28.3651 109.329 28.3656C100.253 28.3656 95.3168 37.8057 94.6338 56.4386H109.329C111.908 56.439 114 58.5314 114 61.1097V101.276C114 103.853 111.907 105.947 109.329 105.947H69.5894C67.0101 105.947 64.914 103.854 64.9135 101.276V61.1097C64.9135 52.1825 65.8136 43.986 67.5854 36.7474C69.4042 29.326 72.1967 22.8356 75.8794 17.4601C79.6708 11.9353 84.4179 7.59859 89.9811 4.57854ZM25.0629 4.57854C30.6622 1.54044 37.1744 0 44.4153 0C46.9932 0.000475 49.0818 2.09142 49.0818 4.67114V23.6944C49.0813 26.2737 46.9903 28.3656 44.4106 28.3656C35.207 28.3665 30.2005 37.8067 29.5065 56.4386H44.4106C46.9908 56.4386 49.0818 58.5309 49.0818 61.1097V101.276C49.0813 103.854 46.9903 105.943 44.4106 105.943H4.67114C2.09047 105.943 0.000475 103.853 0 101.276V61.1097C0 52.1773 0.8987 43.9793 2.67188 36.7431C4.49018 29.3232 7.28175 22.8356 10.9659 17.4601C14.7568 11.9353 19.5006 7.59859 25.0629 4.57854Z"
              fill="white"
            />
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}
