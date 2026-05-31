"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DESTINATIONS = [
  "Paris",
  "Tokyo",
  "Barcelona",
  "New York",
  "Reykjavik",
  "Singapore",
  "Rome",
  "Cape Town",
];

export default function AnimatedHeroDestinations() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % DESTINATIONS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.35 }}
      className="inline-flex items-baseline gap-2 flex-wrap justify-center pt-1"
    >
      <span className="text-white/45 text-sm sm:text-base">Plan your trip to</span>
      <span className="relative h-[1.5em] overflow-hidden inline-block min-w-[148px] text-left">
        <AnimatePresence mode="wait">
          <motion.span
            key={DESTINATIONS[index]}
            initial={{ y: 28, opacity: 0, filter: "blur(4px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -28, opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 gradient-text font-display font-semibold text-xl sm:text-2xl whitespace-nowrap"
          >
            {DESTINATIONS[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.div>
  );
}
