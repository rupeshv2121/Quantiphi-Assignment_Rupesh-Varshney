import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Braces,
  Check,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Nexa AI — Intelligent conversations, instantly" },
      {
        name: "description",
        content:
          "Meet Nexa AI, a fast and thoughtful chat assistant for clear answers, creative ideas, and productive conversations.",
      },
    ],
  }),
});

const experiences = [
  {
    label: "Write",
    icon: MessageSquareText,
    prompt: "Turn a rough idea into a polished project brief.",
    response:
      "A strong project brief needs a clear objective, target audience, key deliverables, success metrics, and an agreed timeline.",
  },
  {
    label: "Plan",
    icon: Braces,
    prompt: "Create a launch plan for a new mobile app.",
    response:
      "Start with beta feedback, then align onboarding, campaign assets, store listing, and support readiness in focused weekly sprints.",
  },
  {
    label: "Learn",
    icon: Sparkles,
    prompt: "Explain RAG in simple, practical terms.",
    response:
      "Retrieval-Augmented Generation lets an AI find relevant source material first, then use that context to produce a grounded answer.",
  },
];

function LandingPage() {
  const [activeExperience, setActiveExperience] = useState(0);
  const experience = experiences[activeExperience];

  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-cyan-400/10 blur-[110px]" />
        <div className="absolute -right-32 top-[-8rem] h-[30rem] w-[30rem] rounded-full bg-blue-500/10 blur-[130px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      <nav className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Nexa AI home">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10">
            <Bot className="h-5 w-5 text-cyan-300" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Nexa AI</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a href="#features" className="transition-colors hover:text-white">
            Features
          </a>
          <a href="#demo" className="transition-colors hover:text-white">
            Experience
          </a>
        </div>

        <Link
          to="/chat"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50"
        >
          Open chat
          <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 lg:min-h-[620px] lg:grid-cols-[0.95fr_1.05fr] lg:pb-24 lg:pt-10">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-3 py-1.5 text-xs font-medium text-cyan-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
            </span>
            Powered by Groq
          </div>

          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-[72px]">
            Think bigger.
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">
              Chat smarter.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
            A fast, thoughtful AI workspace for turning questions into clear answers,
            rough ideas into strong plans, and busy work into momentum.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/chat"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-cyan-300 px-6 text-sm font-bold text-slate-950 shadow-[0_12px_40px_rgba(103,232,249,0.16)] transition hover:-translate-y-0.5 hover:bg-cyan-200"
            >
              Start a conversation
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#demo"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Explore the experience
            </a>
          </div>

          <div className="mt-8 flex items-center gap-5 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-cyan-300" /> Fast streaming
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-cyan-300" /> Saved history
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <Check className="h-3.5 w-3.5 text-cyan-300" /> Tone control
            </span>
          </div>
        </div>

        <div id="demo" className="relative">
          <div className="absolute inset-8 rounded-full bg-cyan-400/[0.08] blur-3xl" />
          <div className="relative mx-auto max-w-[560px] rounded-[28px] border border-white/10 bg-[#0b1728]/95 p-3 shadow-[0_30px_100px_rgba(0,0,0,0.38)]">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                <span className="text-sm font-semibold">Nexa AI</span>
              </div>
              <div className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-slate-400">
                Professional
              </div>
            </div>

            <div className="mt-2 rounded-[20px] border border-white/[0.07] bg-[#07111f] p-4 sm:p-5">
              <div className="mb-4 flex gap-2 overflow-x-auto">
                {experiences.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setActiveExperience(index)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        activeExperience === index
                          ? "bg-cyan-300 text-slate-950"
                          : "border border-white/[0.08] text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-[82%] rounded-2xl rounded-br-md bg-cyan-300 px-4 py-3 text-sm font-medium text-slate-950">
                    {experience.prompt}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10">
                    <Bot className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-sm leading-6 text-slate-200">
                    {experience.response}
                  </div>
                </div>
              </div>

              <Link
                to="/chat"
                className="mt-5 flex h-12 items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-slate-400 transition hover:border-cyan-300/20 hover:bg-white/[0.05]"
              >
                Ask Nexa anything…
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-300 text-slate-950">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 border-t border-white/[0.07] bg-white/[0.018]">
        <div className="mx-auto grid max-w-7xl gap-px px-5 py-10 sm:px-8 md:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Real-time answers",
              text: "Watch responses arrive smoothly with live streaming.",
            },
            {
              icon: Sparkles,
              title: "Your preferred tone",
              text: "Switch between professional, casual, or concise.",
            },
            {
              icon: ShieldCheck,
              title: "Focused workspace",
              text: "Keep your chats organized and easy to revisit.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="border-b border-white/[0.07] py-6 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0"
            >
              <feature.icon className="mb-4 h-5 w-5 text-cyan-300" />
              <h2 className="text-sm font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
