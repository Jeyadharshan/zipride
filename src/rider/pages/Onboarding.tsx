import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, MapPinned, BadgeCheck, Wallet } from "lucide-react";



const SLIDES = [
  {
    icon: MapPinned,
    title: "Book a ride in seconds",
    body: "Set your pickup and drop, choose your ride and you're on the way — no waiting around.",
  },
  {
    icon: BadgeCheck,
    title: "Verified, trusted drivers",
    body: "Every driver is background-checked and rated by riders so you ride with total confidence.",
  },
  {
    icon: Wallet,
    title: "Pay your way",
    body: "Cash, UPI or ZipWallet — flexible payments that fit how you like to move.",
  },
];

export function Onboarding() {
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  const next = () => (last ? navigate({ to: "/login" }) : setI(i + 1));

  return (
    <div className="grid min-h-screen grid-rows-[1fr_auto] bg-background px-6 py-8">
      <div className="flex items-center justify-end">
        <Link to="/login" className="text-sm font-semibold text-muted-foreground">
          Skip
        </Link>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative mb-10 grid h-56 w-56 place-items-center">
          <span className="absolute inset-0 rounded-full gradient-brand-soft blur-2xl" />
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: -20 }}
              transition={{ type: "spring", stiffness: 200, damping: 16 }}
              className="relative grid h-32 w-32 place-items-center rounded-[2rem] gradient-brand text-primary-foreground shadow-glow"
            >
              <slide.icon className="h-14 w-14" />
            </motion.div>
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="max-w-sm"
          >
            <h1 className="text-3xl font-extrabold">{slide.title}</h1>
            <p className="mt-3 text-muted-foreground">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 flex justify-center gap-2">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === i ? "w-8 gradient-brand" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand px-6 py-4 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
        >
          {last ? "Get Started" : "Next"} <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
