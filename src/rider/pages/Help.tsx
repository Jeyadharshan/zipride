import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  HelpCircle,
  Car,
  CreditCard,
  Lock,
  User,
  Wrench,
  Plus,
  Minus,
  MessageSquare,
  Phone,
  Mail,
} from "lucide-react";
import { UserTopNav } from "@/rider/layouts/UserShell";
import { Reveal } from "@/shared/components/kit/Reveal";



const TOPICS = [
  { icon: HelpCircle, title: "General", sub: "FAQs and common queries about ZipRide", count: 24 },
  {
    icon: Car,
    title: "Booking Issues",
    sub: "Problems with your ride booking or driver",
    count: 18,
  },
  {
    icon: CreditCard,
    title: "Payments & Refunds",
    sub: "Payment failures, wallet issues, refunds",
    count: 15,
  },
  { icon: Lock, title: "Safety", sub: "Safety features, SOS, and reporting issues", count: 12 },
  {
    icon: User,
    title: "Account & Profile",
    sub: "Update your account, password, and settings",
    count: 10,
  },
  { icon: Wrench, title: "Other Issues", sub: "Lost & found, app bugs, other topics", count: 8 },
];

const FAQS = [
  {
    q: "How do I book a ride?",
    a: "Open ZipRide, enter your pickup and drop location, choose your ride type, then tap Find Drivers. You'll be matched with a nearby verified driver in seconds.",
  },
  {
    q: "How can I track my driver?",
    a: "Once a driver is assigned you can see their live location, ETA and vehicle details on the tracking screen, plus call or chat with them directly.",
  },
  {
    q: "What payment methods are accepted?",
    a: "ZipRide accepts Cash, UPI (Google Pay, PhonePe, Paytm), and ZipWallet. You can add money to your wallet from the Wallet section and use it for seamless payments.",
  },
  {
    q: "How do I cancel a ride?",
    a: "Tap Cancel Ride on the tracking screen. Cancellations within 2 minutes of booking are free; later cancellations may carry a small fee.",
  },
  {
    q: "What is ZipWallet and how does it work?",
    a: "ZipWallet is your in-app balance. Top it up via UPI or card and pay for rides instantly, plus earn referral bonuses and cashback.",
  },
];

const SUPPORT = [
  {
    icon: Phone,
    title: "Call Support",
    sub: "+91 1800-ZIP-RIDE · Mon–Sat 8AM–8PM",
    cta: "Call Now",
  },
  {
    icon: Mail,
    title: "Email Support",
    sub: "support@zipride.in · Response in 24 hrs",
    cta: "Send Email",
  },
];

export function Help() {
  const [open, setOpen] = useState<number | null>(2);
  return (
    <div className="min-h-screen bg-background">
      <UserTopNav />
      {/* hero */}
      <div className="relative overflow-hidden gradient-hero py-16 text-center text-white">
        <div className="pointer-events-none absolute -left-10 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <h1 className="text-4xl font-extrabold">Help Center</h1>
        <p className="mt-2 text-white/80">How can we help you today?</p>
        <div className="mx-auto mt-6 flex max-w-xl items-center gap-2 px-4">
          <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-foreground shadow-lg">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              placeholder="Search for help topics, FAQs..."
              className="w-full bg-transparent outline-none"
            />
          </div>
          <button className="rounded-2xl bg-foreground/20 px-6 py-3 font-bold backdrop-blur">
            Search
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t, i) => (
            <Reveal key={t.title} delay={i * 0.05}>
              <button className="h-full w-full rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-transform hover:-translate-y-1">
                <div className="grid h-11 w-11 place-items-center rounded-xl gradient-brand-soft text-primary">
                  <t.icon className="h-5 w-5" />
                </div>
                <p className="mt-3 font-bold">{t.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.sub}</p>
                <p className="mt-3 text-sm font-semibold text-primary">{t.count} articles →</p>
              </button>
            </Reveal>
          ))}
        </div>

        <h2 className="mb-4 mt-10 text-2xl font-extrabold">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left font-bold"
              >
                {f.q}
                {open === i ? (
                  <Minus className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-muted-foreground">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {SUPPORT.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft"
            >
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl gradient-brand-soft text-primary">
                <s.icon className="h-6 w-6" />
              </div>
              <p className="mt-3 font-bold">{s.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
              <button className="mt-4 w-full rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary">
                {s.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
