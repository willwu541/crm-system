"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type ChatSummary = {
  id: string;
  name: string;
  email: string;
  company: string;
  status: "open" | "closed";
  updated_at: string;
  last_message: string;
  last_sender: "visitor" | "agent";
  unread: number;
};

type ChatMessage = {
  id: string;
  sender: "visitor" | "agent";
  body: string;
  created_at: string;
};

type Conversation = ChatSummary & {
  page_url?: string;
  created_at: string;
  messages: ChatMessage[];
};

async function chatApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch("/api/export/live-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || "操作失败，请稍后重试。");
  }
  return data as T;
}

function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

export function LiveChatClient() {
  const [items, setItems] = useState<ChatSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [keyword, setKeyword] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const knownConversationsRef = useRef<Map<string, string> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playAlert = useCallback(() => {
    const AudioContextClass = window.AudioContext;
    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;
    void context.resume().then(() => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.3);
    }).catch(() => undefined);
  }, []);

  const enableReminders = useCallback(async () => {
    setRemindersEnabled(true);
    playAlert();
    if (!("Notification" in window)) return;
    const permission = Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
    if (permission === "denied") {
      setError("声音提醒已开启；浏览器通知被阻止，请在地址栏的网站权限中允许通知。");
    } else {
      setError("");
    }
  }, [playAlert]);

  const loadList = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await chatApi<{ conversations: ChatSummary[] }>("list");
      const conversations = data.conversations ?? [];
      const previous = knownConversationsRef.current;
      if (previous && remindersEnabled) {
        const incoming = conversations.filter((item) =>
          item.last_sender === "visitor" &&
          item.unread > 0 &&
          previous.get(item.id) !== item.updated_at,
        );
        if (incoming.length > 0) {
          playAlert();
          if ("Notification" in window && Notification.permission === "granted") {
            const latest = incoming[0];
            const visitor = latest.company || latest.name || `网站访客 ${latest.id.slice(0, 6)}`;
            new Notification(`${visitor} 发来新消息`, {
              body: latest.last_message || "点击查看客户会话",
              tag: `website-chat-${latest.id}`,
            });
          }
        }
      }
      knownConversationsRef.current = new Map(
        conversations.map((item) => [item.id, item.updated_at]),
      );
      setItems(conversations);
      setError("");
      setSelectedId((current) => {
        if (current) return current;
        return conversations.find((item) => item.status === "open")?.id ?? "";
      });
    } catch (cause) {
      if (!quiet) setError(cause instanceof Error ? cause.message : "加载失败。");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [playAlert, remindersEnabled]);

  const loadConversation = useCallback(async (id: string, quiet = false) => {
    if (!id) {
      setConversation(null);
      return;
    }
    try {
      const data = await chatApi<{ conversation: Conversation }>("get", { id });
      setConversation(data.conversation);
      setError("");
    } catch (cause) {
      if (!quiet) setError(cause instanceof Error ? cause.message : "加载会话失败。");
    }
  }, []);

  useEffect(() => {
    void loadList();
    const timer = window.setInterval(() => void loadList(true), 2500);
    return () => window.clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) return;
    void loadConversation(selectedId);
    const timer = window.setInterval(() => void loadConversation(selectedId, true), 2500);
    return () => window.clearInterval(timer);
  }, [selectedId, loadConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  const visibleItems = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "open" && item.status !== "open") return false;
      if (!query) return true;
      return `${item.name} ${item.email} ${item.company} ${item.last_message}`
        .toLowerCase()
        .includes(query);
    });
  }, [items, filter, keyword]);

  const unread = items.reduce((total, item) => total + Number(item.unread || 0), 0);

  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) 网站实时询盘` : "网站实时询盘";
    return () => {
      document.title = "Wiberg Metal CRM";
    };
  }, [unread]);

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    const message = reply.trim();
    if (!selectedId || !message || sending) return;
    setSending(true);
    try {
      const data = await chatApi<{ conversation: Conversation }>("reply", {
        id: selectedId,
        message,
      });
      setConversation(data.conversation);
      setReply("");
      void loadList(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "回复失败。");
    } finally {
      setSending(false);
    }
  }

  async function toggleStatus() {
    if (!conversation) return;
    const status = conversation.status === "open" ? "closed" : "open";
    try {
      const data = await chatApi<{ conversation: Conversation }>("status", {
        id: conversation.id,
        status,
      });
      setConversation(data.conversation);
      void loadList(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "更新状态失败。");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">网站实时询盘</h1>
            {unread > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                {unread} 条新消息
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">访客在官网发消息后，会自动出现在这里。</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void enableReminders()}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              remindersEnabled
                ? "bg-blue-50 text-blue-700"
                : "border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
            }`}
          >
            {remindersEnabled ? "🔔 消息提醒已开启" : "开启消息提醒"}
          </button>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <i className="h-2 w-2 rounded-full bg-emerald-500" /> 客服在线
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid min-h-[660px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[340px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50/70 lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-slate-200 p-4">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索访客或消息"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <div className="grid grid-cols-2 rounded-lg bg-slate-200/70 p-1 text-sm">
              {(["open", "all"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-md px-3 py-1.5 ${filter === value ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  {value === "open" ? "进行中" : "全部"}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[565px] space-y-2 overflow-y-auto p-3">
            {loading ? (
              <p className="p-8 text-center text-sm text-slate-500">正在连接网站客服…</p>
            ) : visibleItems.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">暂无客户会话</p>
            ) : (
              visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-xl border p-4 text-left shadow-sm transition hover:bg-white ${
                    selectedId === item.id
                      ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                      : "border-slate-200 bg-white/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="truncate text-sm text-slate-900">{item.company || item.name || "网站访客"}</strong>
                    <span className="shrink-0 text-[11px] text-slate-400">{timeLabel(item.updated_at)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-500">
                      会话 {item.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={item.status === "open" ? "text-emerald-600" : "text-slate-400"}>
                      {item.status === "open" ? "进行中" : "已结束"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs text-slate-500">{item.last_message || "新会话"}</p>
                    {item.unread > 0 && (
                      <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.unread}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-[660px] flex-col">
          {!conversation ? (
            <div className="m-auto max-w-sm px-6 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-2xl">↗</div>
              <h2 className="font-semibold text-slate-800">选择一个客户会话</h2>
              <p className="mt-1 text-sm text-slate-500">新询盘会自动出现在左侧，不需要刷新页面。</p>
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-900">{conversation.company || conversation.name || "网站访客"}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {[conversation.email, conversation.page_url].filter(Boolean).join(" · ") || `会话编号 ${conversation.id.slice(0, 8)}`}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-400">会话 {conversation.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleStatus()}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  {conversation.status === "open" ? "结束会话" : "重新打开"}
                </button>
              </header>
              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-5">
                {conversation.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === "agent" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] ${message.sender === "agent" ? "text-right" : ""}`}>
                      <div className={`inline-block whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-sm shadow-sm ${
                        message.sender === "agent"
                          ? "rounded-br-md bg-blue-600 text-white"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                      }`}>
                        {message.body}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {message.sender === "agent" ? "我方" : "访客"} · {timeLabel(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              {conversation.status === "open" ? (
                <form onSubmit={sendReply} className="border-t border-slate-200 bg-white p-4">
                  <div className="flex items-end gap-3">
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                      rows={2}
                      maxLength={2000}
                      placeholder="输入回复，Enter 发送，Shift + Enter 换行…"
                      className="min-h-14 flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={!reply.trim() || sending}
                      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending ? "发送中…" : "发送"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="border-t border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">本次会话已结束</div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
