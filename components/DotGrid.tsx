'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';

interface Dot {
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
  animating: boolean;
}

export interface DotGridProps {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  className?: string;
  style?: React.CSSProperties;
}

/* -------------------------- */
/* Strict Safe Throttle       */
/* -------------------------- */
function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number
): T {
  let lastCall = 0;

  const throttled = ((...args: Parameters<T>) => {
    const now = performance.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return func(...args);
    }
  }) as T;

  return throttled;
}

/* -------------------------- */

const DotGrid: React.FC<DotGridProps> = ({
  dotSize = 3,
  gap = 22,
  baseColor = '#333',
  activeColor = '#ffffff',
  proximity = 120,
  className = '',
  style
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<Dot[]>([]);

  const pointer = useRef({ x: 0, y: 0 });

  /* -------------------------- */
  /* Build Grid                 */
  /* -------------------------- */
  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    const cols = Math.floor(width / (dotSize + gap));
    const rows = Math.floor(height / (dotSize + gap));

    const dots: Dot[] = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        dots.push({
          cx: x * (dotSize + gap) + gap,
          cy: y * (dotSize + gap) + gap,
          xOffset: 0,
          yOffset: 0,
          animating: false
        });
      }
    }

    dotsRef.current = dots;
  }, [dotSize, gap]);

  /* -------------------------- */
  /* Resize Handling            */
  /* -------------------------- */
  useEffect(() => {
    buildGrid();

    let ro: ResizeObserver | null = null;

    if ('ResizeObserver' in globalThis) {
      ro = new ResizeObserver(buildGrid);
      if (wrapperRef.current) ro.observe(wrapperRef.current);
    }

    return () => {
      if (ro) ro.disconnect();
    };
  }, [buildGrid]);

  /* -------------------------- */
  /* Mouse Interaction          */
  /* -------------------------- */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      pointer.current.x = e.clientX - rect.left;
      pointer.current.y = e.clientY - rect.top;

      for (const dot of dotsRef.current) {
        const dx = dot.cx - pointer.current.x;
        const dy = dot.cy - pointer.current.y;
        const dist = Math.hypot(dx, dy);

        if (dist < proximity && !dot.animating) {
          dot.animating = true;

          gsap.to(dot, {
            xOffset: dx * 0.15,
            yOffset: dy * 0.15,
            duration: 0.15,
            onComplete: () => {
              gsap.to(dot, {
                xOffset: 0,
                yOffset: 0,
                duration: 0.8,
                ease: 'power3.out',
                onComplete: () => {
                  dot.animating = false;
                }
              });
            }
          });
        }
      }
    };

    const throttled = throttle(onMove, 30);
    globalThis.addEventListener('mousemove', throttled);

    return () => {
      globalThis.removeEventListener('mousemove', throttled);
    };
  }, [proximity]);

  /* -------------------------- */
  /* Draw Loop                  */
  /* -------------------------- */
  useEffect(() => {
    let rafId: number;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const dot of dotsRef.current) {
        ctx.beginPath();
        ctx.arc(
          dot.cx + dot.xOffset,
          dot.cy + dot.yOffset,
          dotSize / 2,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = baseColor;
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [baseColor, dotSize]);

  return (
    <div
      ref={wrapperRef}
      className={`absolute inset-0 ${className}`}
      style={style}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
};

export default DotGrid;