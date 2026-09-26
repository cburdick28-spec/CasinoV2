"use client";

import { useEffect, useRef, useState } from "react";
import GameShell from "@/components/GameShell";
import { useUser } from "@/lib/UserContext";

interface Msg {
  id: number;
  username: string;
  message: string;
  created_at: number;
}

export default function ChatPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/chat");
    const data = await res.json();
    setMessages(data.messages);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!user) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    setText("");
    load();
  }

  return (
    <GameShell title="Chat" emoji="\u{1F4AC}" subtitle="Say hi to the rest of the casino floor.">
      <div className="panel p-4 flex flex-col h-[60vh]">
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
          {messages.map((m) => (
            <div key={m.id} className="text-sm">
              <span className="font-bold text-[var(--gold)]">{m.username}</span>
              <span className="text-muted text-xs ml-2">{new Date(m.created_at).toLocaleTimeString()}</span>
              <div>{m.message}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 mt-3">
          <input
            className="flex-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Say something..."
            maxLength={300}
          />
          <button className="btn btn-gold">Send</button>
        </form>
      </div>
    </GameShell>
  );
}
