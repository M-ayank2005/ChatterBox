"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Eye, EyeOff, Lock, Phone, MessageCircle, ShieldCheck, AlertCircle } from "lucide-react";
import axios from "axios";
import { useStore } from "@/lib/store";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { setUser } = useStore();

  const handleSubmit = async () => {
    if (!phone.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("http://localhost:8080/api/login", { phone, password });
      setUser(res.data.user, res.data.token);
      router.push("/chat");
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      if (msg === "User not found") {
        setError("No account found with this phone number");
      } else if (msg === "Invalid password") {
        setError("Incorrect password. Please try again.");
      } else {
        setError("Invalid phone number or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-auto" style={{ backgroundColor: "#0a1014" }}>
      {/* Top accent bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="h-36 w-full flex-shrink-0 rounded-b-3xl"
        style={{
          background: "linear-gradient(145deg, #008069 0%, #006a57 100%)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      />

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-5 pb-10" style={{ marginTop: "-70px" }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-[440px] overflow-hidden"
          style={{
            backgroundColor: "#1f2a32",
            borderRadius: "28px",
            boxShadow: "0 20px 40px -8px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2)",
            border: "1px solid #2a3942",
          }}
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-5 text-center">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.35, ease: "backOut" }}
              className="w-22 h-22 mx-auto mb-6 flex items-center justify-center rounded-3xl cursor-default hover:scale-[1.02] transition-transform"
              style={{
                width: 88,
                height: 88,
                background: "linear-gradient(135deg, #00a884 0%, #008069 100%)",
                boxShadow: "0 12px 24px -8px rgba(0,168,132,0.3)",
              }}
            >
              <MessageCircle size={44} color="white" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="text-3xl font-semibold tracking-tight"
              style={{ color: "#e9edef" }}
            >
              ChatterBox
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-1.5 text-[17px] font-medium"
              style={{ color: "#8696a0" }}
            >
              Welcome back
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="mt-0.5 text-[14px]"
              style={{ color: "#667781" }}
            >
              Sign in to continue chatting
            </motion.p>
          </div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="px-8 pb-8 space-y-[22px]"
          >
            {/* Phone */}
            <div>
              <label className="block text-[13px] font-medium ml-1.5 mb-1.5 tracking-wide" style={{ color: "#8696a0" }}>
                Phone number
              </label>
              <div
                className="flex items-center rounded-[18px] transition-all duration-200"
                style={{
                  backgroundColor: "#111b21",
                  border: "1.5px solid #2a3942",
                }}
              >
                <Phone size={20} className="ml-4 flex-shrink-0" style={{ color: "#667781" }} />
                <input
                  type="tel"
                  placeholder="+1 (234) 567-8900"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError(""); }}
                  className="flex-1 bg-transparent border-none outline-none text-[16px] px-3.5 py-4 placeholder:font-light"
                  style={{ color: "white", caretColor: "#00a884" }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[13px] font-medium ml-1.5 mb-1.5 tracking-wide" style={{ color: "#8696a0" }}>
                Password
              </label>
              <div
                className="flex items-center rounded-[18px] transition-all duration-200"
                style={{
                  backgroundColor: "#111b21",
                  border: "1.5px solid #2a3942",
                }}
              >
                <Lock size={20} className="ml-4 flex-shrink-0" style={{ color: "#667781" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="flex-1 bg-transparent border-none outline-none text-[16px] px-3.5 py-4 placeholder:font-light"
                  style={{ color: "white", caretColor: "#00a884" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-4 cursor-pointer transition-colors duration-200"
                  style={{ color: "#667781" }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="text-right mt-1.5">
                <a href="#" className="text-[14px] font-medium transition-colors" style={{ color: "#00a884" }}>
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Sign in button */}
            <motion.button
              whileHover={{ translateY: -1, boxShadow: "0 10px 20px rgba(0,168,132,0.35)" }}
              whileTap={{ translateY: 1 }}
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-[18px] mt-3 rounded-[18px] text-white text-[16px] font-semibold flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{
                background: "linear-gradient(145deg, #00a884 0%, #008069 100%)",
                boxShadow: "0 6px 14px rgba(0,168,132,0.25)",
                letterSpacing: "0.3px",
              }}
            >
              {loading ? (
                <span
                  className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"
                />
              ) : (
                "Sign In"
              )}
            </motion.button>

            <p className="text-center text-[13px] mt-6" style={{ color: "#667781", letterSpacing: "0.3px" }}>
              <ShieldCheck size={13} className="inline mr-1 mb-0.5" />
              End-to-end encrypted
            </p>
          </motion.div>

          {/* Footer */}
          <div
            className="px-8 py-[22px] text-center border-t"
            style={{ backgroundColor: "#111b21", borderColor: "#2a3942" }}
          >
            <span className="text-[15px]" style={{ color: "#8696a0" }}>
              {"Don't have an account?"}
              <Link href="/signup" className="ml-1 font-semibold transition-colors" style={{ color: "#00a884" }}>
                Sign up
              </Link>
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}