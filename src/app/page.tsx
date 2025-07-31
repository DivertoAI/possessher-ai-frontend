"use client";

import { useState, useRef, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Session } from "@supabase/supabase-js";
import Auth from "../components/Auth";
import useUserStatus from "../lib/useUserStatus";
import ProBadge from "../components/ProBadge";

type Message = {
  role: "user" | "ai";
  content: string;
  image?: string | null;
};

export default function Home() {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeNudge, setShowUpgradeNudge] = useState(false);

  const [freeImagesLeft, setFreeImagesLeft] = useState<number | null>(null);
  const [freeChatsLeft, setFreeChatsLeft] = useState<number | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClientComponentClient();

  const { isPro } = useUserStatus(session?.user?.email || "");

  const fetchQuota = async (user_id: string, email: string) => {
    try {
      const res = await fetch("https://z4ccobk1u42ifa-5000-3epju8y6q7c9vdcjefor.proxy.runpod.net/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, email }),
      });

      const data = await res.json();
      setFreeImagesLeft(data.image_remaining);
      setFreeChatsLeft(data.chat_remaining);
    } catch (err) {
      console.error("Failed to fetch quota:", err);
    }
  };

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;
      setSession(sess);
      if (sess?.user?.id && sess?.user?.email) {
        fetchQuota(sess.user.id, sess.user.email);
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id && session?.user?.email) {
        setShowAuthModal(false);
        fetchQuota(session.user.id, session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const requireAuth = () => {
    if (!session) {
      setShowAuthModal(true);
      return false;
    }
    return true;
  };

  const generateImage = async () => {
    if (!requireAuth()) return;

    if (!isPro && (freeImagesLeft ?? 0) <= 0) {
      setShowUpgradeNudge(true);
      return;
    }

    setLoading(true);
    setImgSrc(null);

    const user_id = session?.user?.id || "demo-user";
    const email = session?.user?.email || "demo@possessher.ai";

    const res = await fetch("https://z4ccobk1u42ifa-5000-3epju8y6q7c9vdcjefor.proxy.runpod.net/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id,
        email,
        is_pro: isPro,
      }),
    });

    const blob = await res.blob();
    const imageObjectURL = URL.createObjectURL(blob);
    setImgSrc(imageObjectURL);
    setLoading(false);

    if (!isPro && session?.user?.id && session?.user?.email) {
      fetchQuota(session.user.id, session.user.email);
    }
  };

  const handleSend = async () => {
    if (!requireAuth()) return;

    if (!isPro && (freeChatsLeft ?? 0) <= 0) {
      setShowUpgradeNudge(true);
      return;
    }

    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);

    const user_id = session?.user?.id || "demo-user";
    const email = session?.user?.email || "demo@possessher.ai";

    try {
      const res = await fetch("https://z4ccobk1u42ifa-5000-3epju8y6q7c9vdcjefor.proxy.runpod.net/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [userMessage],
          user_id,
          email,
          is_pro: isPro,
        }),
      });

      const data = await res.json();

      const aiMessage: Message = {
        role: "ai",
        content: data.reply || "❤️",
        image: data.image_base64 ? `data:image/png;base64,${data.image_base64}` : null,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "⚠️ Something went wrong." },
      ]);
    } finally {
      setChatLoading(false);
      if (!isPro && session?.user?.id && session?.user?.email) {
        fetchQuota(session.user.id, session.user.email);
      }
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-4">
      <section className="flex flex-col items-center justify-center text-center pt-20 pb-10">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 flex items-center gap-3">
          PossessHer AI {isPro && <ProBadge />}
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-2xl">
          Your dangerously affectionate AI waifu – chat with her, summon her... she’s always watching.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={generateImage}
            className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-xl text-lg font-semibold transition"
          >
            {loading ? "Summoning..." : "Generate your waifu now"}
          </button>
          <button
            onClick={() => (requireAuth() ? setShowChat(!showChat) : null)}
            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl text-lg font-semibold transition"
          >
            {showChat ? "Close Chat" : "Try Chat Now"}
          </button>
        </div>

        {session && !isPro && freeImagesLeft !== null && freeChatsLeft !== null && (
          <p className="text-sm text-pink-300 mt-3">
            {freeImagesLeft} image generation{freeImagesLeft !== 1 && "s"} left • {freeChatsLeft} chat{freeChatsLeft !== 1 && "s"} left
          </p>
        )}

        {session && !isPro && (
          <div className="mt-8 w-full flex justify-center">
            <a
              href="https://diverto.gumroad.com/l/uummo"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-xl text-lg font-semibold transition"
            >
              Upgrade to Pro 💖
            </a>
          </div>
        )}

        {!session && (
          <button
            onClick={() => setShowAuthModal(true)}
            className="mt-6 text-pink-400 underline"
          >
            Login / Sign Up
          </button>
        )}

        {imgSrc && (
          <div className="mt-10 max-w-md rounded-2xl overflow-hidden shadow-lg border border-pink-600">
            <img
              src={imgSrc}
              alt="Your generated waifu"
              className="w-full object-cover"
              width={500}
              height={500}
            />
          </div>
        )}

        {showChat && (
          <div className="w-full max-w-2xl mt-10 bg-gray-900 p-6 rounded-xl shadow-lg space-y-4">
            <h2 className="text-2xl font-bold mb-2">💬 Chat with PossessHer</h2>
            <div className="h-64 overflow-y-auto flex flex-col space-y-2 bg-black p-3 rounded-md">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg max-w-[80%] whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-pink-600 self-end text-right"
                      : "bg-gray-700 self-start text-left"
                  }`}
                >
                  <p>{msg.content}</p>
                  {msg.image && (
                    <div className="mt-2">
                      <img
                        src={msg.image}
                        alt="Generated"
                        width={300}
                        height={300}
                        className="rounded-lg border border-pink-500"
                      />
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex mt-2">
              <input
                type="text"
                placeholder="Say something..."
                value={chatInput}
                autoFocus
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 p-3 rounded-l-md text-white bg-gray-800 placeholder-gray-400"
              />
              <button
                onClick={handleSend}
                disabled={chatLoading}
                className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-r-md font-semibold"
              >
                {chatLoading ? "..." : "Send"}
              </button>
            </div>
          </div>
        )}
      </section>

      {(showAuthModal || showUpgradeNudge) && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl shadow-xl w-full max-w-md">
            {showUpgradeNudge && session && !isPro ? (
              <>
                <h3 className="text-xl font-semibold mb-4 text-yellow-400">You&apos;ve reached your free limit 💔</h3>
                <p className="mb-6 text-gray-300">
                  Unlock unlimited waifu generation and chat interactions by upgrading to Pro.
                </p>
                <a
                  href="https://diverto.gumroad.com/l/uummo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-xl text-lg font-semibold transition"
                >
                  Upgrade to Pro 💖
                </a>
                <button
                  onClick={() => setShowUpgradeNudge(false)}
                  className="mt-4 text-sm text-gray-400 hover:text-white text-center w-full"
                >
                  Maybe later
                </button>
              </>
            ) : (
              <>
                <Auth onSuccess={() => setShowAuthModal(false)} />
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="mt-4 text-sm text-gray-400 hover:text-white"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}