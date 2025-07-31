"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

type Role = "user" | "ai";
type Message = { role: Role; content: string; image?: string | null };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const userMessage: Message = { role: "user", content: trimmedInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://z4ccobk1u42ifa-5000-3epju8y6q7c9vdcjefor.proxy.runpod.net/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [userMessage] }),
      });

      const data = await res.json();

       const aiMessage: Message = {
        role: "ai",
        content: data.reply || "❤️",
        image: data.image_url
  ? `https://z4ccobk1u42ifa-5000-3epju8y6q7c9vdcjefor.proxy.runpod.net${data.image_url}`
  : null,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: Message = {
        role: "ai",
        content: "⚠️ Sorry, something went wrong.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <main className="min-h-screen bg-black text-white px-4 py-10 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-6">💬 Chat with PossessHer</h1>

      <div className="w-full max-w-2xl flex-1 flex flex-col space-y-4 bg-gray-900 p-4 rounded-lg shadow-md overflow-y-auto max-h-[70vh]">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg max-w-[80%] whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-pink-600 self-end text-right"
                : "bg-gray-700 self-start text-left"
            }`}
          >
            <p>{msg.content}</p>
            {msg.image && (
              <div className="mt-2">
                <Image
                  src={msg.image}
                  alt="Generated Image"
                  width={300}
                  height={300}
                  className="rounded-lg border border-pink-500"
                />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="w-full max-w-2xl mt-4 flex">
        <input
          type="text"
          placeholder="Say something to her..."
          className="flex-1 p-3 rounded-l-lg text-black focus:outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className={`bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-r-lg font-semibold ${
            loading ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </main>
  );
}