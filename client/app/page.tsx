"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { MessageCircle, ShieldCheck, Zap, Globe } from "lucide-react";

const features = [
  { icon: <ShieldCheck size={22} />, title: "End-to-End Encrypted", desc: "Every message is secured with military-grade encryption." },
  { icon: <Zap size={22} />, title: "Lightning Fast", desc: "Real-time delivery with near-zero latency worldwide." },
  { icon: <Globe size={22} />, title: "Cross-Platform", desc: "Works seamlessly on web, mobile, and desktop." },
];

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col overflow-auto" style={{ backgroundColor: "#0a1014" }}>
      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-6 pt-20 pb-24 text-center"
        style={{ background: "linear-gradient(170deg, #006a57 0%, #0a1014 60%)" }}>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: "backOut" }}
          className="flex items-center justify-center rounded-[28px] mb-7"
          style={{ width: 100, height: 100, background: "linear-gradient(135deg, #00a884 0%, #008069 100%)", boxShadow: "0 16px 32px -8px rgba(0,168,132,0.4)" }}
        >
          <MessageCircle size={52} color="white" />
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-5xl font-bold tracking-tight" style={{ color: "#e9edef" }}>
          ChatterBox
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="mt-2 text-2xl font-medium tracking-tight" style={{ color: "#8696a0" }}>
          Connect without limits
        </motion.p>

        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="mt-4 text-lg max-w-md" style={{ color: "#8696a0" }}>
          Simple, reliable, private messaging and calling for everyone.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="flex gap-3 mt-8 flex-wrap justify-center">
          <Link href="/signup" className="px-8 py-4 rounded-[18px] text-white font-semibold text-[16px] cursor-pointer"
            style={{ background: "linear-gradient(145deg, #00a884 0%, #008069 100%)", boxShadow: "0 6px 14px rgba(0,168,132,0.3)" }}>
            Get Started
          </Link>
          <Link href="/login" className="px-8 py-4 rounded-[18px] font-semibold text-[16px] cursor-pointer"
            style={{ backgroundColor: "#1f2a32", color: "#00a884", border: "1.5px solid #2a3942" }}>
            Sign In
          </Link>
        </motion.div>
      </div>

      {/* Features */}
      <div className="px-6 py-16 max-w-3xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="flex flex-col gap-3 p-6 rounded-[20px]"
              style={{ backgroundColor: "#1f2a32", border: "1px solid #2a3942" }}>
              <span style={{ color: "#00a884" }}>{f.icon}</span>
              <p className="font-semibold text-[15px]" style={{ color: "#e9edef" }}>{f.title}</p>
              <p className="text-[14px] leading-relaxed" style={{ color: "#8696a0" }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <footer className="text-center py-6 text-[13px]" style={{ color: "#667781", borderTop: "1px solid #2a3942" }}>
        &copy; {new Date().getFullYear()} ChatterBox. All rights reserved.
      </footer>
    </div>
  );
}
