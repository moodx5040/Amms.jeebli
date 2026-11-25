import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, UserRound, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  onClose: () => void;
  onAuthenticated: () => void;
}

export default function AuthDialog({ onClose, onAuthenticated }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (mode === "signup") {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (signupError) throw signupError;
        if (data.session) {
          onAuthenticated();
          onClose();
        } else {
          setMessage("أنشأنا الحساب. افتح رسالة تأكيد البريد ثم سجّل الدخول.");
          setMode("signin");
        }
      } else {
        const { error: signinError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (signinError) throw signinError;
        onAuthenticated();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إكمال العملية. تحقق من البيانات وحاول مجدداً.");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setError("اكتب بريدك الإلكتروني أولاً.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setBusy(false);
    if (resetError) setError(resetError.message);
    else setMessage("إذا كان البريد مسجلاً، ستصلك رسالة لاستعادة كلمة المرور.");
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-button modal-close" onClick={onClose} aria-label="إغلاق"><X size={20} /></button>
        <div className="auth-emblem"><span className="brand-mark">و</span></div>
        <p className="eyebrow">حسابك في الطائف</p>
        <h2 id="auth-title">{mode === "signin" ? "حيّاك من جديد" : "خلّ طلباتك أقرب"}</h2>
        <p className="muted">{mode === "signin" ? "ادخل بحسابك لمتابعة طلباتك." : "أنشئ حساباً وابدأ طلبك من أهل الطائف."}</p>
        <form onSubmit={submit} className="form-stack">
          {mode === "signup" && <label className="field"><span>الاسم</span><div className="input-wrap"><UserRound size={18} /><input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" autoComplete="name" /></div></label>}
          <label className="field"><span>البريد الإلكتروني</span><div className="input-wrap"><Mail size={18} /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" dir="ltr" autoComplete="email" /></div></label>
          <label className="field"><span>كلمة المرور</span><div className="input-wrap"><KeyRound size={18} /><input required minLength={6} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" autoComplete={mode === "signup" ? "new-password" : "current-password"} dir="ltr" /><button className="input-action" type="button" onClick={() => setShowPassword(!showPassword)} aria-label="إظهار كلمة المرور">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          {error && <div className="notice error-notice">{error}</div>}
          {message && <div className="notice success-notice">{message}</div>}
          <button className="button primary full" disabled={busy}>{busy ? "لحظة..." : mode === "signin" ? "تسجيل الدخول" : "إنشاء الحساب"}<ArrowLeft size={17} /></button>
        </form>
        {mode === "signin" && <button className="text-button forgot-link" onClick={resetPassword} disabled={busy}>نسيت كلمة المرور؟</button>}
        <div className="auth-switch">{mode === "signin" ? "ما عندك حساب؟" : "عندك حساب؟"}<button className="text-button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}>{mode === "signin" ? "إنشاء حساب" : "تسجيل الدخول"}</button></div>
        <p className="auth-footnote">بتسجيلك أنت توافق على استخدام بياناتك لإتمام الطلب والتواصل بشأنه.</p>
      </section>
    </div>
  );
}
