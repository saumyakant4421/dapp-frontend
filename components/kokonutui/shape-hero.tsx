"use client";

/**
 * @author: @dorianbaffier
 * @description: Shape Hero
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
  borderRadius = 16,
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
  borderRadius?: number;
}) {
  return (
    <motion.div
      animate={{
        opacity: 1,
        y: 0,
        rotate,
      }}
      className={cn("absolute", className)}
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        className="relative"
        style={{
          width,
          height,
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        <div
          className={cn(
            "absolute inset-0",
            "bg-linear-to-r to-transparent",
            gradient,
            "backdrop-blur-[1px]",
            "ring-1 ring-white/[0.03] dark:ring-white/[0.02]",
            "shadow-[0_2px_16px_-2px_rgba(255,255,255,0.04)]",
            "after:absolute after:inset-0",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.12),transparent_70%)]",
            "after:rounded-[inherit]"
          )}
          style={{ borderRadius }}
        />
      </motion.div>
    </motion.div>
  );
}

export default function ShapeHero({
}: {}) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#050505]">
      <div className="absolute inset-0 bg-linear-to-br from-cyan-500/[0.04] via-transparent to-violet-500/[0.04] blur-3xl" />

      <div className="absolute inset-0 overflow-hidden">
        {/* Tall rectangle - top left */}
        <ElegantShape
          borderRadius={24}
          className="top-[-10%] left-[-15%]"
          delay={0.3}
          gradient="from-white/[0.04]"
          height={500}
          rotate={-8}
          width={300}
        />

        {/* Wide rectangle - bottom right */}
        <ElegantShape
          borderRadius={20}
          className="right-[-20%] bottom-[-5%]"
          delay={0.5}
          gradient="from-white/[0.03]"
          height={200}
          rotate={15}
          width={600}
        />

        {/* Square - middle left */}
        <ElegantShape
          borderRadius={32}
          className="top-[40%] left-[-5%]"
          delay={0.4}
          gradient="from-white/[0.035]"
          height={300}
          rotate={24}
          width={300}
        />

        {/* Small rectangle - top right */}
        <ElegantShape
          borderRadius={12}
          className="top-[5%] right-[10%]"
          delay={0.6}
          gradient="from-white/[0.03]"
          height={100}
          rotate={-20}
          width={250}
        />

        {/* New shapes */}
        {/* Medium rectangle - center right */}
        <ElegantShape
          borderRadius={16}
          className="top-[45%] right-[-10%]"
          delay={0.7}
          gradient="from-white/[0.035]"
          height={150}
          rotate={35}
          width={400}
        />

        {/* Small square - bottom left */}
        <ElegantShape
          borderRadius={28}
          className="bottom-[10%] left-[20%]"
          delay={0.2}
          gradient="from-white/[0.03]"
          height={200}
          rotate={-25}
          width={200}
        />

        {/* Tiny rectangle - top center */}
        <ElegantShape
          borderRadius={10}
          className="top-[15%] left-[40%]"
          delay={0.8}
          gradient="from-white/[0.03]"
          height={80}
          rotate={45}
          width={150}
        />

        {/* Wide rectangle - middle */}
        <ElegantShape
          borderRadius={18}
          className="top-[60%] left-[25%]"
          delay={0.9}
          gradient="from-white/[0.035]"
          height={120}
          rotate={-12}
          width={450}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#050505] via-transparent to-[#050505]/90" />
    </div>
  );
}
