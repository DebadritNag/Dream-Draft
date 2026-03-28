import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import entryVideo from "@/data/video/entry.mp4";
import authBg from "@/data/Auth.png";

const fieldVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.3 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "signup";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    if (isSignUp) {
      if (!displayName) { toast.error("Enter a display name"); setLoading(false); return; }
      const { error } = await signUp(email, password, displayName);
      if (error) { toast.error(error); setLoading(false); return; }
      toast.success("Account created!");
    } else {
      const { error } = await signIn(email, password);
      if (error) { toast.error(error); setLoading(false); return; }
      setLoading(false);
      setShowTransition(true);
      return;
    }
    setLoading(false);
  };

  const toggle = () => {
    setIsSignUp((v) => !v);
    setEmail(""); setPassword(""); setDisplayName("");
  };

  const handleVideoEnd = () => {
    setFadingOut(true);
    setTimeout(() => navigate("/lobby"), 600);
  };

  const fields = isSignUp
    ? [
        { label: "Display Name", type: "text",     value: displayName, set: setDisplayName, placeholder: "Your name" },
        { label: "Email",        type: "email",    value: email,       set: setEmail,       placeholder: "you@example.com" },
        { label: "Password",     type: "password", value: password,    set: setPassword,    placeholder: "••••••••" },
      ]
    : [
        { label: "Email",    type: "email",    value: email,    set: setEmail,    placeholder: "you@example.com" },
        { label: "Password", type: "password", value: password, set: setPassword, placeholder: "••••••••" },
      ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">

      {/* Background image */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${authBg})` }}
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      {/* Overlays */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/70" />

      {/* Cinematic entry transition */}
      <AnimatePresence>
        {showTransition && (
          <motion.div
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: fadingOut ? 0 : 1 }}
            transition={{ duration: 0.5 }}>
            <video
              src={entryVideo}
              autoPlay muted playsInline
              onEnded={handleVideoEnd}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
            <motion.p
              className="relative z-10 text-white/80 text-xl md:text-3xl font-black tracking-widest uppercase text-center"
              initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 4, times: [0, 0.2, 0.8, 1], delay: 0.5 }}
              style={{ textShadow: "0 0 30px rgba(59,130,246,0.8)" }}>
              Assemble Your Squad...
            </motion.p>
            <button onClick={handleVideoEnd}
              className="absolute top-4 right-4 z-20 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-xs font-semibold transition-all">
              Skip →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card */}
      <motion.div
        className="relative z-10 w-full max-w-md mx-4"
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden"
          style={{ boxShadow: "0 0 60px rgba(59,130,246,0.15), 0 0 120px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.1)" }}>

          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)" }} />

          <div className="p-8 md:p-10">
            <motion.div className="text-center mb-8"
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}>
              <motion.div className="text-5xl mb-3"
                animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                ⚽
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1"
                style={{ background: "linear-gradient(135deg, #60a5fa, #a78bfa, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Fantasy Draft
              </h1>
              <p className="text-white/40 text-sm font-medium tracking-wide uppercase">
                {isSignUp ? "Create Your Account" : "Enter the Arena"}
              </p>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div key={isSignUp ? "signup" : "signin"} className="space-y-4">
                {fields.map((f, i) => (
                  <motion.div key={f.label} custom={i} variants={fieldVariants} initial="hidden" animate="visible">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5 block">{f.label}</label>
                    <div className="relative group">
                      <Input
                        type={f.type} placeholder={f.placeholder} value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/60 transition-all duration-300"
                        style={{ boxShadow: "none" }}
                      />
                      <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{ boxShadow: "0 0 0 1px rgba(99,102,241,0.5), 0 0 20px rgba(99,102,241,0.15)" }} />
                    </div>
                  </motion.div>
                ))}

                <motion.div custom={fields.length} variants={fieldVariants} initial="hidden" animate="visible" className="pt-2">
                  <motion.button
                    onClick={handleSubmit} disabled={loading}
                    whileHover={{ scale: 1.03, boxShadow: "0 0 40px rgba(99,102,241,0.5)" }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3.5 rounded-xl font-black text-base text-white relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #6366f1 100%)", boxShadow: "0 0 30px rgba(99,102,241,0.35)" }}>
                    {!loading && (
                      <motion.div className="absolute inset-0 bg-white/10 pointer-events-none"
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                        style={{ skewX: "-20deg" }} />
                    )}
                    <span className="relative z-10">{loading ? "..." : isSignUp ? "🚀 Create Account" : "⚡ Sign In"}</span>
                  </motion.button>
                </motion.div>

                <motion.p custom={fields.length + 1} variants={fieldVariants} initial="hidden" animate="visible"
                  className="text-center text-sm text-white/30 pt-1">
                  {isSignUp ? "Already have an account? " : "Don't have an account? "}
                  <button onClick={toggle} className="text-blue-400 hover:text-blue-300 font-semibold transition-colors hover:underline underline-offset-2">
                    {isSignUp ? "Sign in" : "Sign up"}
                  </button>
                </motion.p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
