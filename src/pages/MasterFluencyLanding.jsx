import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Mic2, Music, Play, Volume2, Award, ChevronRight, Star } from "lucide-react";

// Animated waveform bars
function Waveform({ count = 20, color = "#3B82F6", height = 40, playing = true }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {Array.from({ length: count }).map((_, i) => {
        const baseH = 30 + Math.sin(i * 0.8) * 40 + Math.random() * 20;
        return (
          <motion.div
            key={i}
            className="rounded-full flex-1"
            style={{ background: color, minWidth: 3 }}
            animate={playing ? { height: [`${baseH * 0.4}%`, `${baseH}%`, `${baseH * 0.6}%`, `${baseH}%`] } : { height: "20%" }}
            transition={{ duration: 1.2 + i * 0.07, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }}
          />
        );
      })}
    </div>
  );
}

// Pulsing mic glow
function MicGlow({ active = true }) {
  return (
    <div className="relative flex items-center justify-center">
      {active && (
        <>
          <motion.div
            className="absolute rounded-full"
            style={{ background: "radial-gradient(circle, #2563EB20 0%, transparent 70%)", width: 120, height: 120 }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{ background: "radial-gradient(circle, #22D3EE15 0%, transparent 70%)", width: 80, height: 80 }}
            animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
        </>
      )}
      <div
        className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #1D4ED8, #3B82F6)", boxShadow: "0 0 30px rgba(29,78,216,0.4)" }}
      >
        <Mic2 className="w-7 h-7 text-white" />
      </div>
    </div>
  );
}

// Flow lines background
function FlowLines() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="flowGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
          <stop offset="50%" stopColor="#22D3EE" stopOpacity="1" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="flowGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
          <stop offset="50%" stopColor="#FB923C" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d="M0,200 Q360,100 720,200 T1440,200" stroke="url(#flowGrad1)" strokeWidth="1.5" fill="none"
        animate={{ d: ["M0,200 Q360,100 720,200 T1440,200", "M0,200 Q360,300 720,200 T1440,200", "M0,200 Q360,100 720,200 T1440,200"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
      <motion.path d="M0,400 Q360,300 720,400 T1440,400" stroke="url(#flowGrad2)" strokeWidth="1" fill="none"
        animate={{ d: ["M0,400 Q360,300 720,400 T1440,400", "M0,400 Q360,500 720,400 T1440,400", "M0,400 Q360,300 720,400 T1440,400"] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
      <motion.path d="M0,600 Q480,500 960,600 T1440,600" stroke="url(#flowGrad1)" strokeWidth="0.8" fill="none"
        animate={{ d: ["M0,600 Q480,500 960,600 T1440,600", "M0,600 Q480,700 960,600 T1440,600", "M0,600 Q480,500 960,600 T1440,600"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }} />
    </svg>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: "easeOut" },
  viewport: { once: true },
};

export default function MasterFluencyLanding() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setActiveStep(s => (s + 1) % 6), 2500);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { num: "01", title: "Learn the song", icon: "🎵" },
    { num: "02", title: "Learn the words", icon: "📖" },
    { num: "03", title: "Talk about it", icon: "💬" },
    { num: "04", title: "Sing inside it", icon: "🎤" },
    { num: "05", title: "Record your version", icon: "⏺" },
    { num: "06", title: "Download it", icon: "⬇️" },
  ];

  const phrases = [
    { he: "לאן אתה הולך?", en: "Where are you going?", tr: "Le'an ata holech?" },
    { he: "אני רוצה ללכת", en: "I want to go", tr: "Ani rotze lalechet" },
    { he: "הלכתי אתמול", en: "I went yesterday", tr: "Halachti etmol" },
    { he: "אלך מחר", en: "I'll go tomorrow", tr: "Elech machar" },
  ];

  return (
    <div style={{ background: "#0A1628", color: "#FFFFFF", fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background radials */}
        <div className="absolute inset-0">
          <div style={{ background: "radial-gradient(ellipse 80% 60% at 20% 50%, #3B82F612 0%, transparent 70%)" }} className="absolute inset-0" />
          <div style={{ background: "radial-gradient(ellipse 60% 40% at 80% 30%, #22D3EE0A 0%, transparent 70%)" }} className="absolute inset-0" />
          <div style={{ background: "radial-gradient(ellipse 40% 40% at 60% 80%, #F59E0B08 0%, transparent 70%)" }} className="absolute inset-0" />
        </div>
        <FlowLines />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <motion.div {...fadeUp} className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
              style={{ background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.35)", color: "#93C5FD" }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#60A5FA" }} />
              Music-first language learning
            </div>

            <h1 className="font-black leading-[1.08] tracking-tight" style={{ fontSize: "clamp(2.8rem, 6vw, 4.5rem)", fontFamily: "'Inter Tight', 'Inter', sans-serif" }}>
              Masteri Languages.<br />
              <span style={{ background: "linear-gradient(135deg, #60A5FA, #93C5FD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Speak it. Perform it.
              </span>
            </h1>

            <p style={{ color: "#94A3B8", fontSize: "1.15rem", lineHeight: 1.75, maxWidth: 480 }}>
              Speak real Hebrew through songs, conversation, and repetition — then record your own version of the track.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: "0 0 30px #3B82F660" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/SingingHome")}
                className="px-8 py-4 rounded-xl font-bold text-white text-base flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, #2563EB, #60A5FA)", boxShadow: "0 0 20px #2563EB40" }}
              >
                Start Singing <ChevronRight className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(96,165,250,0.12)" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/?lesson=intro")}
                className="px-8 py-4 rounded-xl font-bold text-base"
                style={{ border: "1px solid rgba(96,165,250,0.25)", color: "#93C5FD", background: "transparent" }}
              >
                Try First Lesson Free
              </motion.button>
            </div>

            <p style={{ color: "#64748B", fontSize: "0.8rem" }}>No boring drills. No passive lessons. Just real speaking through music.</p>
          </motion.div>

          {/* Right — Product Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-8 rounded-3xl" style={{ background: "radial-gradient(ellipse at center, #3B82F615 0%, transparent 70%)" }} />
            <div className="relative rounded-3xl p-6 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>

              {/* Now playing header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p style={{ color: "#71717A", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Now Playing</p>
                  <p className="font-bold mt-1" style={{ fontSize: "1.1rem" }}>Learn to Greet · Session 1</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3B82F6, #22D3EE)" }}>
                  <Play className="w-4 h-4 text-white fill-white" />
                </div>
              </div>

              {/* Waveform */}
              <div className="mb-6">
                <Waveform count={28} color="#3B82F6" height={56} />
              </div>

              {/* Current line */}
              <div className="rounded-2xl p-4 mb-5" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
                <p style={{ color: "#71717A", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Current Line</p>
                <p className="text-white font-bold text-xl mb-1">Where are you going?</p>
                <p style={{ color: "#22D3EE", fontSize: "1.4rem", fontFamily: "'Heebo', sans-serif", direction: "rtl" }}>לאן אתה הולך?</p>
                <p style={{ color: "#71717A", fontSize: "0.85rem", marginTop: 4 }}>Le'an ata holech?</p>
              </div>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-xs mb-2" style={{ color: "#71717A" }}>
                  <span>1:24</span><span>3:45</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #3B82F6, #22D3EE)" }}
                    animate={{ width: ["33%", "36%", "33%"] }} transition={{ duration: 3, repeat: Infinity }} />
                </div>
              </div>

              {/* Record button */}
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 0 30px #F59E0B50" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsRecording(r => !r)}
                className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-3"
                style={{ background: isRecording ? "linear-gradient(135deg, #EF4444, #F97316)" : "linear-gradient(135deg, #F59E0B, #FB923C)", boxShadow: isRecording ? "0 0 25px #EF444440" : "0 0 20px #F59E0B30" }}
              >
                {isRecording ? (
                  <><motion.div className="w-4 h-4 rounded bg-white" animate={{ scale: [1, 0.8, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />Recording...</>
                ) : (
                  <><Mic2 className="w-5 h-5" />Record Your Version</>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
          <div className="w-px h-12 rounded-full" style={{ background: "linear-gradient(to bottom, transparent, #3B82F6, transparent)" }} />
        </motion.div>
      </section>

      {/* ─── QUICK BENEFITS ───────────────────────────────────── */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Music, title: "Learn through real songs", desc: "Every lesson is a song you'll actually want to sing", accent: "#60A5FA" },
            { icon: Volume2, title: "Speak from day one", desc: "No listening-only lessons. You speak immediately", accent: "#93C5FD" },
            { icon: Mic2, title: "Record your voice", desc: "Your voice becomes part of the performance", accent: "#BFDBFE" },
            { icon: Award, title: "Actually remember", desc: "Music + repetition = real long-term memory", accent: "#7DD3FC" },
          ].map((card, i) => (
            <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="group rounded-xl p-5 transition-all duration-300 cursor-default inline-block w-full"
              style={{ background: "rgba(30,58,138,0.3)", border: "1px solid rgba(96,165,250,0.15)", backdropFilter: "blur(10px)" }}
              whileHover={{ background: "rgba(30,58,138,0.5)", borderColor: `${card.accent}40` }}>
              <div className="inline-flex items-center justify-center rounded-lg mb-3 p-2 transition-all duration-300 group-hover:scale-110"
                style={{ background: `rgba(96,165,250,0.12)`, border: `1px solid rgba(96,165,250,0.2)` }}>
                <card.icon className="w-4 h-4" style={{ color: card.accent }} />
              </div>
              <h3 className="font-bold text-white mb-1 text-sm">{card.title}</h3>
              <p style={{ color: "#94A3B8", fontSize: "0.8rem", lineHeight: 1.6 }}>{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-16">
          <p style={{ color: "#93C5FD", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600, marginBottom: 12 }}>The process</p>
          <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontFamily: "'Inter Tight', 'Inter', sans-serif" }}>
            Six steps to fluency
          </h2>
          <p style={{ color: "#94A3B8", marginTop: 16, fontSize: "1.05rem" }}>Each lesson is a complete musical experience</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((step, i) => (
            <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              className="rounded-2xl p-6 transition-all duration-500"
              style={{
                background: activeStep === i ? "rgba(37,99,235,0.18)" : "rgba(15,40,100,0.35)",
                border: `1px solid ${activeStep === i ? "rgba(96,165,250,0.45)" : "rgba(96,165,250,0.1)"}`,
                boxShadow: activeStep === i ? "0 0 20px rgba(96,165,250,0.12)" : "none",
              }}>
              <div className="flex items-center gap-3 mb-3">
                <span style={{ color: "#93C5FD", fontWeight: 800, fontSize: "0.75rem", fontFamily: "monospace" }}>{step.num}</span>
                <span className="text-2xl">{step.icon}</span>
              </div>
              <h3 className="font-bold text-white">{step.title}</h3>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── WHY THIS WORKS ───────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-16">
          <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontFamily: "'Inter Tight', 'Inter', sans-serif" }}>
            Why this works
          </h2>
        </motion.div>

        <motion.div {...fadeUp} className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl p-8" style={{ background: "rgba(15,40,100,0.3)", border: "1px solid rgba(96,165,250,0.1)" }}>
            <h3 className="font-bold mb-6" style={{ color: "#64748B", fontSize: "1.2rem" }}>Most apps</h3>
            <ul className="space-y-4">
              {["Tap and guess", "Forget by tomorrow", "Never actually speak"].map((t, i) => (
                <li key={i} className="flex items-center gap-3" style={{ color: "#64748B" }}>
                  <span style={{ color: "#F87171", fontSize: "1.2rem" }}>✕</span>{t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl p-8" style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(96,165,250,0.3)", boxShadow: "0 0 40px rgba(37,99,235,0.1)" }}>
            <h3 className="font-black mb-6" style={{ fontSize: "1.2rem", background: "linear-gradient(135deg, #60A5FA, #93C5FD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Masteri Languages</h3>
            <ul className="space-y-4">
              {["Hear → repeat → perform", "Music burns it into memory", "You speak from lesson one", "You walk away with a recording"].map((t, i) => (
                <li key={i} className="flex items-center gap-3 text-white font-medium">
                  <span style={{ color: "#22C55E", fontSize: "1.2rem" }}>✓</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <motion.p {...fadeUp} className="text-center font-black mt-14" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontFamily: "'Inter Tight', 'Inter', sans-serif" }}>
        You don't study languages.{" "}
        <span style={{ background: "linear-gradient(135deg, #60A5FA, #93C5FD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>You use them.</span>
        </motion.p>
      </section>

      {/* ─── MIC SECTION ──────────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 80% at 50% 50%, #3B82F608 0%, transparent 70%)" }} />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div {...fadeUp} className="flex justify-center mb-10">
            <MicGlow active={true} />
          </motion.div>
          <motion.h2 {...fadeUp} className="font-black tracking-tight mb-6" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontFamily: "'Inter Tight', 'Inter', sans-serif" }}>
            Your voice.<br />
            <span style={{ background: "linear-gradient(135deg, #3B82F6, #22D3EE)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>In the track.</span>
          </motion.h2>
          <motion.p {...fadeUp} style={{ color: "#A1A1AA", fontSize: "1.1rem", lineHeight: 1.8, maxWidth: 480, margin: "0 auto" }}>
            At the end of every lesson, you record yourself singing the song. Your voice gets layered into the instrumental. You walk away with a real Hebrew track — starring you.
          </motion.p>
        </div>
      </section>

      {/* ─── WHAT YOU'LL SAY ──────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-16">
          <p style={{ color: "#93C5FD", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600, marginBottom: 12 }}>After one lesson</p>
          <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontFamily: "'Inter Tight', 'Inter', sans-serif" }}>
            You'll be saying this
          </h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 gap-4">
          {phrases.map((p, i) => (
            <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="rounded-xl p-5 group cursor-default transition-all duration-300"
              style={{ background: "rgba(15,40,100,0.35)", border: "1px solid rgba(96,165,250,0.15)" }}
              whileHover={{ background: "rgba(37,99,235,0.2)", borderColor: "rgba(96,165,250,0.35)" }}>
              <p className="font-bold text-lg mb-1 text-white">{p.en}</p>
              <p className="font-bold text-xl mb-1" style={{ color: "#93C5FD", fontFamily: "'Heebo', 'Rubik', sans-serif", direction: "rtl" }}>{p.he}</p>
              <p style={{ color: "#64748B", fontSize: "0.8rem" }}>{p.tr}</p>
            </motion.div>
          ))}
        </div>
        <motion.p {...fadeUp} className="text-center mt-8" style={{ color: "#64748B" }}>Built for speaking — not just recognizing.</motion.p>
      </section>

      {/* ─── LEVEL SYSTEM ─────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-16">
          <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontFamily: "'Inter Tight', 'Inter', sans-serif" }}>
            From repetition to performance
          </h2>
        </motion.div>
        <div className="flex flex-col md:flex-row gap-3">
          {[
            { level: 1, label: "Repeat", color: "#BFDBFE" },
            { level: 2, label: "Understand", color: "#93C5FD" },
            { level: 3, label: "Respond", color: "#60A5FA" },
            { level: 4, label: "Speak freely", color: "#3B82F6" },
            { level: 5, label: "Perform", color: "#2563EB", highlight: true },
          ].map((item, i) => (
            <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="flex-1 rounded-xl py-4 px-3 text-center transition-all duration-300"
              style={{
                background: item.highlight ? "rgba(37,99,235,0.2)" : "rgba(15,40,100,0.3)",
                border: `1px solid ${item.highlight ? "rgba(96,165,250,0.5)" : "rgba(96,165,250,0.12)"}`,
                boxShadow: item.highlight ? "0 0 20px rgba(37,99,235,0.2)" : "none",
                transform: item.highlight ? "scale(1.04)" : "scale(1)",
              }}>
              <p className="font-bold text-xs uppercase tracking-widest mb-1" style={{ color: item.color }}>Level {item.level}</p>
              <p className="font-black text-sm" style={{ color: item.highlight ? "#BFDBFE" : "#64748B" }}>{item.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-16">
          <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontFamily: "'Inter Tight', 'Inter', sans-serif" }}>
            What early users say
          </h2>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { quote: "First time I actually spoke Hebrew without thinking.", author: "Early User", sub: "Beta tester" },
            { quote: "I didn't feel like I was studying at all.", author: "Beta Tester", sub: "Week 1 user" },
          ].map((t, i) => (
            <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.15 }}
              className="rounded-2xl p-8"
              style={{ background: "rgba(15,40,100,0.3)", border: "1px solid rgba(96,165,250,0.12)" }}>
              <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-yellow-400" style={{ color: "#F59E0B" }} />)}
              </div>
              <p className="text-white text-lg font-medium mb-6 leading-relaxed">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ background: "linear-gradient(135deg, #3B82F6, #22D3EE)", color: "white" }}>
                  {t.author[0]}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{t.author}</p>
                  <p style={{ color: "#71717A", fontSize: "0.75rem" }}>{t.sub}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <div style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, #3B82F610 0%, transparent 70%)" }} className="absolute inset-0" />
          <FlowLines />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp} className="flex justify-center mb-10">
            <Waveform count={24} color="#3B82F680" height={48} />
          </motion.div>
          <motion.h2 {...fadeUp} className="font-black tracking-tight mb-6" style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", fontFamily: "'Inter Tight', 'Inter', sans-serif", lineHeight: 1.1 }}>
            Stop studying Hebrew.<br />
            <span style={{ background: "linear-gradient(135deg, #3B82F6, #22D3EE)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Start speaking it.
            </span>
          </motion.h2>
          <motion.p {...fadeUp} style={{ color: "#A1A1AA", fontSize: "1.1rem", marginBottom: 40, lineHeight: 1.8 }}>
            Learn through music, speak with confidence, and record your own version of the song.
          </motion.p>
          <motion.div {...fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: "0 0 40px #3B82F660" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/SingingHome")}
              className="px-10 py-5 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #2563EB, #60A5FA)", boxShadow: "0 0 25px rgba(37,99,235,0.35)" }}>
              Start Your First Song <ChevronRight className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, borderColor: "rgba(255,255,255,0.35)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/?lesson=intro")}
              className="px-10 py-5 rounded-xl font-bold text-base"
              style={{ border: "1px solid rgba(96,165,250,0.25)", color: "#93C5FD", background: "transparent" }}>
              Try It Free
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────── */}
      <footer className="py-12 px-6" style={{ borderTop: "1px solid rgba(96,165,250,0.1)", background: "#071020" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-black text-xl" style={{ fontFamily: "'Inter Tight', 'Inter', sans-serif", background: "linear-gradient(135deg, #60A5FA, #93C5FD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Masteri Languages
            </p>
            <p style={{ color: "#475569", fontSize: "0.8rem", marginTop: 4 }}>Built for people who want to speak, not just understand.</p>
          </div>
          <div className="flex gap-8">
            {["Features", "How It Works", "Pricing", "Contact"].map((link) => (
              <a key={link} href="#" style={{ color: "#475569", fontSize: "0.875rem", textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = "#93C5FD"}
                onMouseLeave={e => e.target.style.color = "#475569"}>
                {link}
              </a>
            ))}
          </div>
          <p style={{ color: "#334155", fontSize: "0.75rem" }}>© 2026 Masteri Languages</p>
        </div>
      </footer>
    </div>
  );
}