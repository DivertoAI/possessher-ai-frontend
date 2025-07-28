"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

type AuthProps = {
  onSuccess?: () => void;
};

export default function Auth({ onSuccess }: AuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setMessage("");
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setMessage(error.message);
        } else {
          setMessage("✅ Logged in!");
          onSuccess?.();
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setMessage(error.message);
        } else {
          setMessage("📧 Check your email to confirm your account.");
        }
      }
    } catch (err) {
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg max-w-md mx-auto space-y-4 shadow-xl border border-pink-600">
      <h2 className="text-2xl font-bold">{isLogin ? "Login" : "Sign Up"}</h2>
      
      <input
        type="email"
        placeholder="Email"
        className="w-full p-3 rounded bg-black text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-600"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-3 rounded bg-black text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-600"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />
      
      <button
        onClick={handleSubmit}
        className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 rounded font-semibold transition"
        disabled={loading}
      >
        {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
      </button>

      <p className="text-sm text-center">
        {isLogin ? "Need an account?" : "Already have an account?"}{" "}
        <button
          className="underline"
          onClick={() => {
            setIsLogin(!isLogin);
            setMessage("");
          }}
        >
          {isLogin ? "Sign up" : "Login"}
        </button>
      </p>

      {message && <p className="text-pink-400 text-sm text-center">{message}</p>}
    </div>
  );
}