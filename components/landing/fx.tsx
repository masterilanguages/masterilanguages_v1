"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useMotionValueEvent,
  useInView,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Reveal — fade + rise as it scrolls into view                        */
/* ------------------------------------------------------------------ */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* ScrambleText — "decode" effect that resolves to the final string    */
/* ------------------------------------------------------------------ */
const GLYPHS = "!<>-_\\/[]{}=+*^?#·:.";

export function ScrambleText({
  text,
  className,
  duration = 1500,
  delay = 0,
}: {
  text: string;
  className?: string;
  duration?: number;
  delay?: number;
}) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(text);
      return;
    }
    let raf = 0;
    let t0: number | null = null;
    const tick = (now: number) => {
      if (t0 === null) t0 = now;
      const elapsed = now - t0 - delay;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      const revealed = Math.floor(progress * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        if (i < revealed || text[i] === " ") out += text[i];
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setDisplay(out);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setDisplay(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration, delay]);

  return <span className={className}>{display}</span>;
}

/* ------------------------------------------------------------------ */
/* TiltCard — 3D perspective tilt that follows the cursor              */
/* ------------------------------------------------------------------ */
export function TiltCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [9, -9]), { stiffness: 150, damping: 16 });
  const ry = useSpring(useTransform(mx, [0, 1], [-9, 9]), { stiffness: 150, damping: 16 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const reset = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* MagneticButton — pulls slightly toward the cursor                   */
/* ------------------------------------------------------------------ */
export function MagneticButton({
  children,
  href,
  className,
  strength = 0.35,
}: {
  children: ReactNode;
  href: string;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 14 });
  const sy = useSpring(y, { stiffness: 220, damping: 14 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy }}
      className={className}
    >
      {children}
    </motion.a>
  );
}

/* ------------------------------------------------------------------ */
/* Counter — count-up when scrolled into view                          */
/* ------------------------------------------------------------------ */
export function Counter({
  to,
  suffix = "",
  prefix = "",
  duration = 1600,
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    let t0: number | null = null;
    const tick = (now: number) => {
      if (t0 === null) t0 = now;
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {val.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee — infinite horizontal scroll, pauses on hover               */
/* ------------------------------------------------------------------ */
export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="marquee-pause relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="animate-marquee flex w-max gap-4">
        {row.map((item, i) => (
          <span
            key={i}
            className="glass-panel flex items-center gap-2.5 whitespace-nowrap rounded-full px-6 py-3 text-sm font-medium text-slate-100"
          >
            <span className="a-dot h-1.5 w-1.5 shrink-0 rounded-full" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Meteors — diagonal streaks falling across a container               */
/* ------------------------------------------------------------------ */
export function Meteors({ count = 14 }: { count?: number }) {
  const [meteors, setMeteors] = useState<
    { left: string; top: string; delay: string; dur: string }[]
  >([]);

  // Randomise on the client only to avoid hydration mismatch.
  useEffect(() => {
    setMeteors(
      Array.from({ length: count }).map(() => ({
        left: `${Math.floor(Math.random() * 100)}%`,
        top: `${Math.floor(Math.random() * 40) - 10}%`,
        delay: `${(Math.random() * 5).toFixed(2)}s`,
        dur: `${(Math.random() * 3 + 4).toFixed(2)}s`,
      }))
    );
  }, [count]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {meteors.map((m, i) => (
        <span
          key={i}
          className="meteor"
          style={{ left: m.left, top: m.top, animationDelay: m.delay, animationDuration: m.dur }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sparkles — twinkling dots                                           */
/* ------------------------------------------------------------------ */
export function Sparkles({ count = 40 }: { count?: number }) {
  const [dots, setDots] = useState<
    { left: string; top: string; size: string; delay: string; dur: string }[]
  >([]);

  useEffect(() => {
    setDots(
      Array.from({ length: count }).map(() => {
        const s = (Math.random() * 2 + 1).toFixed(1);
        return {
          left: `${(Math.random() * 100).toFixed(2)}%`,
          top: `${(Math.random() * 100).toFixed(2)}%`,
          size: `${s}px`,
          delay: `${(Math.random() * 4).toFixed(2)}s`,
          dur: `${(Math.random() * 3 + 2).toFixed(2)}s`,
        };
      })
    );
  }, [count]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d, i) => (
        <span
          key={i}
          className="sparkle"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            animationDelay: d.delay,
            animationDuration: d.dur,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PreviewNav — sticky header that condenses on scroll                 */
/* ------------------------------------------------------------------ */
export function PreviewNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50"
      initial={false}
      animate={{
        paddingTop: scrolled ? 8 : 16,
        paddingBottom: scrolled ? 8 : 16,
      }}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-6 py-3 transition-all duration-300 ${
          scrolled
            ? "glass-panel border-white/10 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]"
            : "border-transparent"
        }`}
      >
        <span className="font-display text-lg font-extrabold tracking-tight text-shine">
          Masteri Languages
        </span>
        <div className="flex items-center gap-3">
          <a
            href="#programs"
            className="hidden rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-300 sm:block"
          >
            Student Login
          </a>
          <a
            href="#programs"
            className="a-outline rounded-full px-5 py-2.5 text-sm font-semibold backdrop-blur"
          >
            See Programs
          </a>
        </div>
      </div>
    </motion.header>
  );
}
