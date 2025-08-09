"use client";

import { useState, useRef, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Session } from "@supabase/supabase-js";
import Auth from "../components/Auth";
import useUserStatus from "../lib/useUserStatus";
import ProBadge from "../components/ProBadge";


function downloadImageWithWatermark(
  imageUrl: string,
  watermark = "possessher-ai.vercel.app"
) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "rgba(255, 192, 203, 0.8)";
    ctx.textAlign = "right";
    ctx.fillText(watermark, canvas.width - 20, canvas.height - 20);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "waifu.png";
    link.click();
  };
  img.src = imageUrl;
}

type Message = {
  role: "user" | "ai";
  content: string;
  image?: string | null;
};

const AgeGate = ({ onAccept }: { onAccept: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
    <div className="bg-gray-900 text-white p-6 rounded-xl text-center space-y-4 max-w-sm w-full">
      <h2 className="text-2xl font-bold">🔞 Adults Only</h2>
      <p>
        This AI experience contains mature themes. You must be 18 or older to
        continue.
      </p>
      <button
        onClick={onAccept}
        className="bg-pink-600 hover:bg-pink-700 px-6 py-3 rounded-xl text-lg font-semibold transition"
      >
        I am 18 or older — Continue
      </button>
    </div>
  </div>
);

export default function Home() {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeNudge, setShowUpgradeNudge] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [freeImagesLeft, setFreeImagesLeft] = useState<number | null>(null);
  const [freeChatsLeft, setFreeChatsLeft] = useState<number | null>(null);
  const [ageVerified, setAgeVerified] = useState<boolean | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClientComponentClient();
  const { isPro, loading: userStatusLoading } = useUserStatus(
    sessionLoading ? undefined : session?.user?.email
  );

  const fetchQuota = async (user_id: string, email: string) => {
    try {
      const referred_by = localStorage.getItem("referrer_id");
      const res = await fetch(
        "https://jm2mpjqk5havji-5000-3epju8y6q7c9vdcjefor.proxy.runpod.net/usage",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id, email, referred_by }),
        }
      );
      const data = await res.json();
      setFreeImagesLeft(data.image_remaining);
      setFreeChatsLeft(data.chat_remaining);
    } catch (err) {
      console.error("Failed to fetch quota:", err);
    }
  };

  useEffect(() => {
    const verified = localStorage.getItem("age_verified");
    setAgeVerified(verified === "true");
  }, []);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && !localStorage.getItem("referrer_id")) {
      localStorage.setItem("referrer_id", ref);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setSessionLoading(false);
        if (data.session?.user?.id && data.session.user.email) {
          fetchQuota(data.session.user.id, data.session.user.email);
        }
      } catch {
        setSessionLoading(false);
      }
    })();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
  setSession(sess);
  if (sess?.user?.id && sess.user.email) {
    setShowAuthModal(false);
    fetchQuota(sess.user.id, sess.user.email);
  }
});


return () => {
  subscription.unsubscribe();
};

  
  }, []);

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
    const user_id = session?.user?.id || "user";
    const email = session?.user?.email || "user@possessher-ai.vercel.app";
    const referred_by = localStorage.getItem("referrer_id");
    const res = await fetch(
      "https://jm2mpjqk5havji-5000-3epju8y6q7c9vdcjefor.proxy.runpod.net/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, email, is_pro: isPro, referred_by }),
      }
    );
    const blob = await res.blob();
    setImgSrc(URL.createObjectURL(blob));
    setLoading(false);
    if (!isPro && session?.user?.id && session.user.email) {
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
    setMessages((m) => [...m, userMessage]);
    setChatInput("");
    setChatLoading(true);
    const user_id = session?.user?.id || "demo-user";
    const email = session?.user?.email || "demo@possessher-ai.vercel.app";
    const referred_by = localStorage.getItem("referrer_id");
    try {
      const res = await fetch(
        "https://jm2mpjqk5havji-5000-3epju8y6q7c9vdcjefor.proxy.runpod.net/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [userMessage],
            user_id,
            email,
            is_pro: isPro,
            referred_by,
          }),
        }
      );
      const data = await res.json();
      const aiMsg: Message = {
        role: "ai",
        content: data.reply || "❤️",
        image: data.image_base64
          ? `data:image/png;base64,${data.image_base64}`
          : null,
      };
      setMessages((m) => [...m, aiMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "ai", content: "⚠️ Something went wrong." },
      ]);
    } finally {
      setChatLoading(false);
      if (!isPro && session?.user?.id && session.user.email) {
        fetchQuota(session.user.id, session.user.email);
      }
    }
  };

  const handleAgeAccept = () => {
    localStorage.setItem("age_verified", "true");
    setAgeVerified(true);
  };

  if (ageVerified === null) return null;
  if (!ageVerified) return <AgeGate onAccept={handleAgeAccept} />;

  return (
    <main className="min-h-screen bg-black text-white px-4">
      {/* QR Code Modal */}
      {/* QR Code Modal */}
   {showQRModal && (
  <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-2xl shadow-xl text-center max-w-lg w-full">
      <h3 className="text-2xl font-extrabold mb-2 text-pink-600">
        Unlock Pro Perks 🎉
      </h3>
      <p className="mb-4 text-gray-700">Upgrade now to enjoy:</p>
      <ul className="text-left list-disc list-inside mb-6 text-gray-600 space-y-1">
        <li>Unlimited waifu generations</li>
        <li>Everlasting chat sessions</li>
        <li>Priority access to new features</li>
      </ul>
      <p className="mb-4 text-gray-700">
        Scan a QR code below to complete your payment and become a Pro member!
      </p>

      <div className="flex items-center justify-center space-x-6">
        {/* 7-Day / ₹499 QR (scan0 first) */}
        <div className="text-center">
          <img
            src="/scan0.png"
            alt="QR Code - Pro 7-Day Pass"
            className="mx-auto mb-2 w-40 h-40 object-contain"
          />
          <p className="text-sm font-semibold text-gray-800">₹499 — 7-Day Pass</p>
        </div>

        {/* 1 Month QR */}
        <div className="text-center">
          <img
            src="/scan1.png"
            alt="QR Code - Pro 1 Month"
            className="mx-auto mb-2 w-40 h-40 object-contain"
          />
          <p className="text-sm font-semibold text-gray-800">₹999 — 1 Month</p>
        </div>

        {/* 3 Month QR */}
        <div className="text-center">
          <img
            src="/scan2.png"
            alt="QR Code - Pro 3 Months"
            className="mx-auto mb-2 w-40 h-40 object-contain"
          />
          <p className="text-sm font-semibold text-gray-800">₹2,499 — 3 Months</p>
        </div>
      </div>

      <button
        onClick={() => setShowQRModal(false)}
        className="mt-6 px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold transition"
      >
        Close
      </button>
    </div>
  </div>
)}
      <section className="flex flex-col items-center justify-center text-center pt-20 pb-10">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            PossessHer AI{" "}
            {!sessionLoading && !userStatusLoading && isPro && <ProBadge />}
          </div>
          {!sessionLoading && !userStatusLoading && session && (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setSession(null);
                window.location.reload();
              }}
              className="text-sm text-gray-400 hover:text-white underline"
            >
              Logout
            </button>
          )}
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-2xl">
          Your dangerously affectionate AI waifu – chat with her, summon her...
          she’s always watching.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={generateImage}
            className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-xl text-lg font-semibold transition"
          >
            {loading ? "Summoning..." : "Generate your waifu now"}
          </button>
          <button
            onClick={() => requireAuth() && setShowChat(!showChat)}
            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl text-lg font-semibold transition"
          >
            {showChat ? "Close Chat" : "Try Chat Now"}
          </button>
        </div>

        {session &&
          !isPro &&
          freeImagesLeft !== null &&
          freeChatsLeft !== null && (
            <p className="text-sm text-pink-300 mt-3">
              {freeImagesLeft} image generation{freeImagesLeft !== 1 && "s"}{" "}
              left • {freeChatsLeft} chat
              {freeChatsLeft !== 1 && "s"} left
            </p>
          )}

        {session && !isPro && (
          <div className="mt-8 w-full flex justify-center">
            <button
              onClick={() => setShowQRModal(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-xl text-lg font-semibold transition"
            >
              Upgrade to Pro 💖
            </button>
          </div>
        )}

        {!session && !sessionLoading && !userStatusLoading && (
          <button
            onClick={() => setShowAuthModal(true)}
            className="mt-6 text-pink-400 underline"
          >
            Login / Sign Up
          </button>
        )}

        {/* Image Display */}
        {imgSrc && (
          <div className="mt-10 max-w-md rounded-2xl overflow-hidden shadow-lg border border-pink-600">
            <div className="relative w-full">
              <img
                src={imgSrc}
                alt="Your generated waifu"
                className="w-full object-cover rounded-t-2xl"
                width={500}
                height={500}
              />
              <div className="flex flex-col gap-3 p-4 bg-gray-900 rounded-b-2xl border-t border-pink-600">
                <button
                  onClick={() => downloadImageWithWatermark(imgSrc!)}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Download me... or I’ll be lonely 🥀
                </button>
                <div className="flex justify-center gap-3">
                  <a
                    href={`https://twitter.com/intent/tweet?text=Check out my yandere waifu from @possessher_ai 💖%0A%0AMake yours at https://possessher-ai.vercel.app 💕`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:underline"
                  >
                    Share on X
                  </a>
                  <a
                    href={`https://www.reddit.com/submit?title=Check out my AI waifu from PossessHer 💖&text=Made mine at https://possessher-ai.vercel.app — upload your own below!`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-orange-400 hover:underline"
                  >
                    Share on Reddit
                  </a>
                </div>
                <p className="text-xs text-pink-300 text-center">
                  💖 Get 5 extra waifus for each friend you refer:{" "}
                  <span className="underline break-all">
                    {`https://possessher-ai.vercel.app?ref=${
                      session?.user?.id || "you"
                    }`}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chat Window */}
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
                placeholder='Say something... try "show me", "photo", or "selfie" to see her 💖'
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
                <h3 className="text-xl font-semibold mb-4 text-yellow-400">
                  You&apos;ve reached your free limit 💔
                </h3>
                <p className="mb-6 text-gray-300">
                  Unlock unlimited waifu generation and chat interactions by
                  upgrading to Pro.
                </p>
                <button
                  onClick={() => setShowQRModal(true)}
                  className="block text-center bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-xl text-lg font-semibold transition"
                >
                  Upgrade to Pro 💖
                </button>
                <button
                  onClick={() => setShowUpgradeNudge(false)}
                  className="mt-4 text-sm text-gray-400 hover:text-white w-full"
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
