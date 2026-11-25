import { useEffect, useState } from "react";
import { Bot, Headset, LoaderCircle, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

interface Props { profile: Profile; onClose: () => void; }
interface Message { id: string; sender_type: "customer" | "assistant" | "staff"; body: string; created_at: string; }

export default function SupportPanel({ profile, onClose }: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refreshMessages = async (id: string) => {
    const { data } = await supabase.from("support_messages").select("id,sender_type,body,created_at").eq("conversation_id", id).order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: conversation } = await supabase.from("conversations").select("id").eq("customer_id", profile.id).eq("status", "open").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!active) return;
      if (conversation?.id) {
        setConversationId(conversation.id);
        await refreshMessages(conversation.id);
      }
    })();
    return () => { active = false; };
  }, [profile.id]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError("");
    try {
      let id = conversationId;
      if (!id) {
        const { data, error: openError } = await supabase.rpc("open_support_conversation", { p_subject: "طلب دعم من التطبيق" });
        if (openError) throw openError;
        id = data as string;
        setConversationId(id);
      }
      const { error: insertError } = await supabase.from("support_messages").insert({ conversation_id: id, sender_id: profile.id, sender_type: "customer", body });
      if (insertError) throw insertError;
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", id);
      setDraft("");
      await refreshMessages(id);
      const { error: assistantError } = await supabase.functions.invoke("support-assistant", { body: { conversation_id: id, message: body } });
      if (assistantError) {
        setError("وصلت رسالتك للدعم. الرد الآلي غير مفعّل حالياً، وسيراجعها المؤسس.");
      } else {
        await refreshMessages(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إرسال رسالتك الآن.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="support-panel" role="dialog" aria-modal="true" aria-labelledby="support-title">
        <header className="support-head"><div className="support-avatar"><Headset size={19} /></div><div><h2 id="support-title">دعم وصلني</h2><span><i className="online-dot" /> نسمعك ونساعدك</span></div><button className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={20} /></button></header>
        <div className="support-messages">
          <div className="message-bubble assistant-message"><span className="message-author"><Bot size={14} /> مساعد وصلني</span>أهلًا {profile.full_name || "بك"}! اكتب استفسارك، وسيوصله للفريق. الرد الآلي التمهيدي يظهر عند تفعيل مساعد الدعم.</div>
          {messages.map((message) => <div key={message.id} className={`message-bubble ${message.sender_type === "customer" ? "customer-message" : "assistant-message"}`}><span className="message-author">{message.sender_type === "customer" ? "أنت" : message.sender_type === "staff" ? "فريق الدعم" : "مساعد وصلني"}</span>{message.body}</div>)}
          {busy && <div className="typing-line"><LoaderCircle size={15} className="spin" /> جارٍ الإرسال...</div>}
        </div>
        {error && <p className="support-note">{error}</p>}
        <form className="support-compose" onSubmit={send}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="اكتب رسالتك هنا..." maxLength={2000} /><button className="send-button" aria-label="إرسال" disabled={busy || !draft.trim()}><Send size={18} /></button></form>
      </section>
    </div>
  );
}
