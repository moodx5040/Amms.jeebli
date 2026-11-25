import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowLeft, BadgePercent, BellRing, Box, Check, ChevronDown, CircleHelp, ClipboardList, Gauge, ImagePlus, LoaderCircle, MapPinned, Megaphone, PackagePlus, Pencil, Plus, Search, Settings2, ShieldCheck, ShoppingBag, Trash2, Truck, Users, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Category, Order, Profile, Product } from "@/lib/types";

interface Props { profile: Profile; onExit: () => void; onRefresh: () => void; }
type Tab = "overview" | "orders" | "catalog" | "couriers" | "team" | "promotions" | "ads" | "support" | "settings";
const tabs: { id: Tab; label: string; icon: typeof Gauge }[] = [
  { id: "overview", label: "نظرة عامة", icon: Gauge }, { id: "orders", label: "الطلبات", icon: ClipboardList },
  { id: "catalog", label: "الأقسام والمنتجات", icon: Box }, { id: "couriers", label: "المندوبون", icon: Truck },
  { id: "team", label: "الفريق والصلاحيات", icon: Users }, { id: "promotions", label: "العروض", icon: BadgePercent },
  { id: "ads", label: "الإعلانات", icon: Megaphone }, { id: "support", label: "الدعم", icon: CircleHelp }, { id: "settings", label: "إعدادات التطبيق", icon: Settings2 },
];
const permissionOptions = [
  ["orders.view", "مشاهدة الطلبات"], ["orders.manage", "إدارة حالات الطلبات"], ["orders.assign", "إسناد الطلبات"],
  ["catalog.manage", "إدارة الأقسام والمنتجات"], ["couriers.manage", "إدارة طلبات المندوبين"], ["promotions.manage", "إدارة العروض"],
  ["announcements.manage", "إدارة الإعلانات"], ["support.manage", "إدارة الدعم"], ["users.view", "مشاهدة المستخدمين"], ["settings.manage", "إدارة الإعدادات"],
] as const;
const statusLabels: Record<string, string> = { pending: "جديد", accepted: "مقبول", preparing: "قيد التجهيز", ready: "جاهز", picked_up: "تم الاستلام", on_the_way: "في الطريق", delivered: "تم التسليم", rejected: "مرفوض", cancelled: "ملغي" };
const kindLabels: Record<string, string> = { products: "منتجات", ride: "مشوار", restaurant: "طلب مطعم" };
const money = (value: number | string | null | undefined) => `${Number(value || 0).toFixed(2)} ر.س`;

async function uploadFile(file: File | null, folder: string) {
  if (!file) return null;
  const cleanName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `${folder}/${Date.now()}-${cleanName}`;
  const { error } = await supabase.storage.from("app-images").upload(key, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("app-images").getPublicUrl(key).data.publicUrl;
}

export default function AdminDashboard({ profile, onExit, onRefresh }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("10");
  const [serviceOpen, setServiceOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", kind: "products", file: null as File | null });
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", category_id: "", spicy_option: false, file: null as File | null });
  const [promoForm, setPromoForm] = useState({ title: "", code: "", discount_type: "percentage", discount_value: "", ends_at: "" });
  const [adForm, setAdForm] = useState({ title: "", body: "", media_type: "text", skip_after_seconds: "5", file: null as File | null });
  const [teamDraft, setTeamDraft] = useState<Record<string, { role: string; permissions: Record<string, boolean> }>>({});

  const refresh = useCallback(async () => {
    const [c, p, o, a, u, promo, ads, conv, settings] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("products").select("*").order("sort_order"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("courier_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("promotions").select("*").order("created_at", { ascending: false }),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      supabase.from("conversations").select("*").order("last_message_at", { ascending: false }).limit(100),
      supabase.from("app_settings").select("*").in("key", ["delivery_fee", "service_open"]),
    ]);
    if (c.data) setCategories(c.data as Category[]);
    if (p.data) setProducts(p.data as Product[]);
    if (o.data) setOrders(o.data as Order[]);
    if (a.data) setApplications(a.data);
    if (u.data) setProfiles(u.data as Profile[]);
    if (promo.data) setPromotions(promo.data);
    if (ads.data) setAnnouncements(ads.data);
    if (conv.data) setConversations(conv.data);
    for (const row of settings.data || []) {
      if (row.key === "delivery_fee") setDeliveryFee(String(row.value?.amount ?? 10));
      if (row.key === "service_open") setServiceOpen(row.value === true || row.value?.open === true);
    }
    setTeamDraft((current) => {
      const next = { ...current };
      for (const user of (u.data || []) as Profile[]) if (!next[user.id]) next[user.id] = { role: user.role, permissions: user.permissions || {} };
      return next;
    });
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setNotice("");
    try { await action(); setNotice(success); await refresh(); onRefresh(); }
    catch (err) { setNotice(err instanceof Error ? err.message : "تعذر حفظ التغيير."); }
    finally { setBusy(false); }
  };

  const addCategory = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const image_url = await uploadFile(categoryForm.file, "categories");
      const slug = `${categoryForm.name.trim().toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase.from("categories").insert({ name: categoryForm.name.trim(), slug, description: categoryForm.description, kind: categoryForm.kind, image_url });
      if (error) throw error;
      setCategoryForm({ name: "", description: "", kind: "products", file: null });
    }, "تمت إضافة القسم.");
  };

  const addProduct = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (!productForm.category_id) throw new Error("اختر قسماً للمنتج.");
      const image_url = await uploadFile(productForm.file, "products");
      const { error } = await supabase.from("products").insert({ name: productForm.name.trim(), description: productForm.description, price: Number(productForm.price), category_id: productForm.category_id, spicy_option: productForm.spicy_option, image_url });
      if (error) throw error;
      setProductForm({ name: "", description: "", price: "", category_id: "", spicy_option: false, file: null });
    }, "تمت إضافة المنتج.");
  };

  const addPromotion = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const { error } = await supabase.from("promotions").insert({ title: promoForm.title, code: promoForm.code.toUpperCase() || null, discount_type: promoForm.discount_type, discount_value: Number(promoForm.discount_value), ends_at: promoForm.ends_at || null });
      if (error) throw error;
      setPromoForm({ title: "", code: "", discount_type: "percentage", discount_value: "", ends_at: "" });
    }, "تم حفظ العرض.");
  };

  const addAnnouncement = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const media_url = await uploadFile(adForm.file, "announcements");
      const { error } = await supabase.from("announcements").insert({ title: adForm.title, body: adForm.body, media_type: adForm.media_type, media_url, skip_after_seconds: Number(adForm.skip_after_seconds) });
      if (error) throw error;
      setAdForm({ title: "", body: "", media_type: "text", skip_after_seconds: "5", file: null });
    }, "تم إنشاء الإعلان.");
  };

  const reviewApplication = (id: string, approve: boolean) => void run(async () => {
    const { error } = await supabase.rpc("review_courier_application", { p_application_id: id, p_approve: approve });
    if (error) throw error;
  }, approve ? "تم قبول طلب المندوب." : "تم رفض طلب المندوب.");

  const filteredOrders = useMemo(() => orders.filter((o) => `${o.order_number} ${o.customer_name} ${o.customer_phone}`.toLowerCase().includes(search.toLowerCase())), [orders, search]);
  const openOrders = orders.filter((order) => !["delivered", "rejected", "cancelled"].includes(order.status));
  const couriers = profiles.filter((user) => user.role === "courier" || user.role === "founder");
  const pendingApps = applications.filter((item) => item.status === "pending");

  const changeStatus = (order: Order, status: string) => void run(async () => {
    const { error } = await supabase.rpc("set_order_status", { p_order_id: order.id, p_status: status, p_note: null });
    if (error) throw error;
  }, `تم تحديث الطلب #${order.order_number}.`);

  const assignOrder = (order: Order, courierId: string) => void run(async () => {
    const { error } = await supabase.rpc("assign_order", { p_order_id: order.id, p_courier_id: courierId || null });
    if (error) throw error;
  }, "تم تحديث تعيين الطلب.");

  const saveTeamUser = (userId: string) => void run(async () => {
    const draft = teamDraft[userId];
    const { error } = await supabase.rpc("set_user_role", { p_user_id: userId, p_role: draft.role, p_permissions: draft.permissions });
    if (error) throw error;
  }, "تم حفظ الدور والصلاحيات.");

  const saveSettings = () => void run(async () => {
    const fee = Number(deliveryFee);
    if (!Number.isFinite(fee) || fee < 0) throw new Error("أدخل رسماً صحيحاً لا يقل عن صفر.");
    const { error: feeError } = await supabase.from("app_settings").upsert({ key: "delivery_fee", value: { amount: fee }, is_public: true, updated_by: profile.id });
    if (feeError) throw feeError;
    const { error: openError } = await supabase.from("app_settings").upsert({ key: "service_open", value: serviceOpen, is_public: true, updated_by: profile.id });
    if (openError) throw openError;
  }, "تم حفظ إعدادات الخدمة.");

  const selectConversation = async (conversation: any) => {
    setSelectedConversation(conversation);
    const { data } = await supabase.from("support_messages").select("*").eq("conversation_id", conversation.id).order("created_at");
    setMessages(data || []);
  };

  const sendSupportReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedConversation || !reply.trim()) return;
    await run(async () => {
      const { error } = await supabase.from("support_messages").insert({ conversation_id: selectedConversation.id, sender_id: profile.id, sender_type: "staff", body: reply.trim() });
      if (error) throw error;
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString(), status: "waiting" }).eq("id", selectedConversation.id);
      setReply("");
      await selectConversation(selectedConversation);
    }, "تم إرسال الرد للعميل.");
  };

  const removeRow = (table: string, id: string, label: string) => {
    if (!window.confirm(`تأكيد حذف ${label}؟`)) return;
    void run(async () => { const { error } = await supabase.from(table).delete().eq("id", id); if (error) throw error; }, "تم الحذف.");
  };

  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span className="brand-mark">و</span><div><b>وصلني الطائف</b><small>لوحة التحكم</small></div></div>
        <div className="admin-owner"><span className="owner-avatar"><ShieldCheck size={17} /></span><div><b>{profile.full_name || "المؤسس"}</b><small>المؤسس • كامل الصلاحيات</small></div></div>
        <nav className="admin-nav" aria-label="القائمة الإدارية">
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={`admin-nav-item ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}><Icon size={18} /><span>{label}</span>{id === "orders" && openOrders.length > 0 && <i className="nav-count">{openOrders.length}</i>}</button>)}
        </nav>
        <button className="admin-back" onClick={onExit}><ArrowLeft size={18} /> العودة للتطبيق</button>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar"><div><div className="crumb">إدارة التطبيق <span>/</span> <b>{tabs.find((item) => item.id === tab)?.label}</b></div><h1>{tabs.find((item) => item.id === tab)?.label}</h1></div><div className="admin-top-actions"><span className="live-pill"><i /> النظام يعمل</span><button className="icon-button" onClick={() => void refresh()} aria-label="تحديث"><Activity size={18} /></button><button className="button subtle" onClick={onExit}>واجهة العميل <ArrowLeft size={16} /></button></div></header>
        {notice && <div className={`notice ${notice.includes("تعذر") || notice.includes("صلاحية") || notice.includes("مطلوب") ? "error-notice" : "success-notice"}`}><span>{notice}</span><button onClick={() => setNotice("")} aria-label="إغلاق"><X size={16} /></button></div>}
        {busy && <div className="saving-line"><LoaderCircle size={15} className="spin" /> جارٍ حفظ التغييرات بأمان...</div>}

        {tab === "overview" && <section className="admin-content">
          <div className="overview-welcome"><div><span className="eyebrow light">مركز تحكم وصلني</span><h2>صباح الخير، {profile.full_name || "مؤسس وصلني"}</h2><p>كل تفاصيل التوصيل والمشاوير في مكان واحد.</p></div><div className="welcome-art"><MapPinned size={44} /></div></div>
          <div className="stat-grid"><StatCard label="طلبات تحتاج متابعة" value={String(openOrders.length)} icon={ClipboardList} tone="green" /><StatCard label="طلبات جديدة" value={String(orders.filter((o) => o.status === "pending").length)} icon={ShoppingBag} tone="yellow" /><StatCard label="مندوبون بانتظار قبولك" value={String(pendingApps.length)} icon={Truck} tone="blue" /><StatCard label="إجمالي الطلبات" value={String(orders.length)} icon={Activity} tone="plain" /></div>
          <div className="overview-columns"><section className="admin-card"><div className="card-heading"><div><h3>آخر الطلبات</h3><p>تابع التحديثات أولاً بأول</p></div><button className="text-button" onClick={() => setTab("orders")}>كل الطلبات <ArrowLeft size={15} /></button></div><OrderList orders={orders.slice(0, 5)} onStatus={changeStatus} couriers={couriers} onAssign={assignOrder} /></section><section className="admin-card quick-actions"><div className="card-heading"><div><h3>اختصارات سريعة</h3><p>أدِر التطبيق بسهولة</p></div></div><button onClick={() => setTab("catalog")}><span className="quick-icon green"><PackagePlus size={18} /></span><span><b>أضف منتجاً</b><small>أضف منتجاً إلى الكتالوج</small></span><ArrowDownRight size={17} /></button><button onClick={() => setTab("promotions")}><span className="quick-icon yellow"><BadgePercent size={18} /></span><span><b>أنشئ عرضاً</b><small>خصم أو رمز ترويجي جديد</small></span><ArrowDownRight size={17} /></button><button onClick={() => setTab("couriers")}><span className="quick-icon blue"><Truck size={18} /></span><span><b>طلبات المناديب</b><small>{pendingApps.length} طلبات بانتظار المراجعة</small></span><ArrowDownRight size={17} /></button></section></div>
          <div className="admin-card"><div className="card-heading"><div><h3>لمحة عن الكتالوج</h3><p>المحتوى المنشور للعملاء</p></div><button className="text-button" onClick={() => setTab("catalog")}>إدارة الكتالوج <ArrowLeft size={15} /></button></div><div className="catalog-mini-stats"><div><b>{categories.length}</b><span>أقسام</span></div><div><b>{products.length}</b><span>منتجات</span></div><div><b>{promotions.filter((p) => p.is_active).length}</b><span>عروض مفعّلة</span></div><div><b>{couriers.length}</b><span>مندوبون</span></div></div></div>
        </section>}

        {tab === "orders" && <section className="admin-content"><div className="admin-card"><div className="card-heading"><div><h3>إدارة الطلبات</h3><p>كل طلب يصل إليك أولاً. أنت من يختار المندوب أو يتولى التوصيل.</p></div><div className="search-box small-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث برقم الطلب أو العميل" /></div></div><OrderList orders={filteredOrders} onStatus={changeStatus} couriers={couriers} onAssign={assignOrder} empty="ما فيه طلبات مطابقة حتى الآن." /></div></section>}

        {tab === "catalog" && <section className="admin-content"><div className="split-grid"><section className="admin-card"><div className="card-heading"><div><h3>الأقسام</h3><p>أنشئ قسم منتجات أو مشاوير أو طلب حر.</p></div><span className="count-chip">{categories.length} قسم</span></div><form className="admin-form" onSubmit={addCategory}><label>اسم القسم<input required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="مثال: قهوة وحلى" /></label><label>وصف مختصر<input value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="اختياري" /></label><label>نوع الخدمة<select value={categoryForm.kind} onChange={(e) => setCategoryForm({ ...categoryForm, kind: e.target.value })}><option value="products">منتجات</option><option value="ride">توصيل / مشوار</option><option value="restaurant">طلب حر / مطعم</option></select></label><label className="upload-box"><ImagePlus size={18} /><span>{categoryForm.file?.name || "صورة القسم (اختياري)"}</span><input type="file" accept="image/*" onChange={(e) => setCategoryForm({ ...categoryForm, file: e.target.files?.[0] || null })} /></label><button className="button primary" disabled={busy}><Plus size={16} /> إضافة القسم</button></form><div className="simple-list">{categories.map((category) => <div className="simple-row" key={category.id}>{category.image_url ? <img src={category.image_url} alt="" /> : <span className="row-icon"><Box size={17} /></span>}<div><b>{category.name}</b><small>{kindLabels[category.kind]} • {category.is_active ? "مفعّل" : "مخفي"}</small></div><button className="icon-button danger-icon" onClick={() => removeRow("categories", category.id, "القسم")} aria-label="حذف القسم"><Trash2 size={16} /></button></div>)}</div></section>
          <section className="admin-card"><div className="card-heading"><div><h3>المنتجات</h3><p>أضف اسم المنتج وسعره وصورته وخياراته.</p></div><span className="count-chip">{products.length} منتج</span></div><form className="admin-form" onSubmit={addProduct}><label>اسم المنتج<input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="مثال: ساندويتش دجاج" /></label><label>السعر (ر.س)<input required type="number" min="0" step="0.5" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} placeholder="0" /></label><label>القسم<select required value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}><option value="">اختر القسم</option>{categories.filter((c) => c.kind === "products").map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>الوصف<textarea rows={2} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="وصف يساعد العميل على الاختيار" /></label><label className="upload-box"><ImagePlus size={18} /><span>{productForm.file?.name || "صورة المنتج (اختياري)"}</span><input type="file" accept="image/*" onChange={(e) => setProductForm({ ...productForm, file: e.target.files?.[0] || null })} /></label><label className="toggle-line"><input type="checkbox" checked={productForm.spicy_option} onChange={(e) => setProductForm({ ...productForm, spicy_option: e.target.checked })} /><span>إتاحة اختيار عادي أو حراق</span></label><button className="button primary" disabled={busy}><Plus size={16} /> إضافة المنتج</button></form><div className="simple-list">{products.map((product) => <div className="simple-row" key={product.id}>{product.image_url ? <img src={product.image_url} alt="" /> : <span className="row-icon"><ShoppingBag size={17} /></span>}<div className="flex-grow"><b>{product.name}</b><small>{money(product.price)}{product.spicy_option ? " • عادي / حراق" : ""}</small></div><button className="icon-button danger-icon" onClick={() => removeRow("products", product.id, "المنتج")} aria-label="حذف المنتج"><Trash2 size={16} /></button></div>)}</div></section></div></section>}

        {tab === "couriers" && <section className="admin-content"><div className="admin-card"><div className="card-heading"><div><h3>طلبات انضمام المندوبين</h3><p>راجع البيانات ثم وافق أو ارفض. الطلبات لا تذهب للمندوبين تلقائياً.</p></div><span className="count-chip warning-chip">{pendingApps.length} بانتظارك</span></div>{applications.length === 0 ? <EmptyState text="ما وصلتك طلبات انضمام حتى الآن." /> : applications.map((app) => <div className="application-card" key={app.id}><div className="application-avatar"><Truck size={21} /></div><div className="application-info"><b>{app.full_name}</b><a href={`tel:${app.phone}`}>{app.phone}</a><small>{app.vehicle_type || "نوع المركبة غير محدد"}{app.note ? ` • ${app.note}` : ""}</small><span className={`status-chip ${app.status === "approved" ? "good" : app.status === "rejected" ? "bad" : "warning"}`}>{app.status === "pending" ? "بانتظار المراجعة" : app.status === "approved" ? "مقبول" : "مرفوض"}</span></div>{app.status === "pending" && <div className="application-actions"><button className="button primary compact" onClick={() => reviewApplication(app.id, true)}><Check size={15} /> قبول مندوب</button><button className="button outline-red compact" onClick={() => reviewApplication(app.id, false)}>رفض الطلب</button></div>}</div>)}</div><div className="admin-card"><div className="card-heading"><div><h3>المندوبون المعتمدون</h3><p>المندوب المقبول فقط يمكن إسناد طلب إليه.</p></div></div>{couriers.filter((c) => c.role === "courier").map((courier) => <div className="simple-row" key={courier.id}><span className="row-icon"><Truck size={17} /></span><div><b>{courier.full_name}</b><small>{courier.email} • {courier.is_active ? "نشط" : "موقوف"}</small></div><span className="status-chip good">معتمد</span></div>)}</div></section>}

        {tab === "team" && <section className="admin-content"><div className="admin-card"><div className="card-heading"><div><h3>الفريق والصلاحيات</h3><p>المؤسس وحده يعيّن الأدوار والصلاحيات. لا يمكن إنشاء مؤسس آخر أو خفض حساب المؤسس.</p></div><span className="founder-lock"><ShieldCheck size={17} /> صلاحيات المؤسس محمية</span></div>{profiles.map((user) => { const draft = teamDraft[user.id] || { role: user.role, permissions: user.permissions || {} }; const locked = user.email.toLowerCase() === "2008mamms@gmail.com"; return <div className="team-card" key={user.id}><div className="team-user"><span className="owner-avatar"><Users size={17} /></span><div><b>{user.full_name || "مستخدم"} {locked && <span className="founder-tag">المؤسس</span>}</b><small>{user.email} • {roleLabel(user.role)}</small></div></div>{!locked && <><div className="team-role"><label>الدور<select value={draft.role} onChange={(e) => setTeamDraft({ ...teamDraft, [user.id]: { ...draft, role: e.target.value } })}><option value="customer">عميل</option><option value="courier">مندوب</option><option value="support">فريق دعم</option><option value="admin">إداري</option></select></label><button className="button primary compact" onClick={() => saveTeamUser(user.id)}>حفظ الدور</button></div><details className="permission-details"><summary>صلاحيات هذا الحساب <ChevronDown size={15} /></summary><div className="permission-grid">{permissionOptions.map(([key, label]) => <label key={key} className="toggle-line"><input type="checkbox" checked={!!draft.permissions[key]} onChange={(e) => setTeamDraft({ ...teamDraft, [user.id]: { ...draft, permissions: { ...draft.permissions, [key]: e.target.checked } } })} /><span>{label}</span></label>)}</div><button className="button outline compact" onClick={() => saveTeamUser(user.id)}>حفظ الصلاحيات</button></details></>}</div>; })}</div></section>}

        {tab === "promotions" && <section className="admin-content"><div className="split-grid"><section className="admin-card"><div className="card-heading"><div><h3>إنشاء عرض</h3><p>خصم بالنسبة أو مبلغ ثابت مع رمز اختياري.</p></div><BadgePercent size={22} /></div><form className="admin-form" onSubmit={addPromotion}><label>اسم العرض<input required value={promoForm.title} onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })} placeholder="عرض نهاية الأسبوع" /></label><label>رمز الخصم (اختياري)<input value={promoForm.code} onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })} placeholder="TAIF10" dir="ltr" /></label><div className="form-row"><label>نوع الخصم<select value={promoForm.discount_type} onChange={(e) => setPromoForm({ ...promoForm, discount_type: e.target.value })}><option value="percentage">نسبة مئوية</option><option value="fixed">مبلغ ثابت</option></select></label><label>قيمة الخصم<input required type="number" min="0" step="0.5" value={promoForm.discount_value} onChange={(e) => setPromoForm({ ...promoForm, discount_value: e.target.value })} /></label></div><label>ينتهي في (اختياري)<input type="datetime-local" value={promoForm.ends_at} onChange={(e) => setPromoForm({ ...promoForm, ends_at: e.target.value ? new Date(e.target.value).toISOString() : "" })} /></label><button className="button primary"><Plus size={16} /> إنشاء العرض</button></form></section><section className="admin-card"><div className="card-heading"><div><h3>العروض الحالية</h3><p>إيقاف أو حذف أي عرض من هنا.</p></div><span className="count-chip">{promotions.length} عرض</span></div><div className="simple-list">{promotions.map((promo) => <div className="simple-row" key={promo.id}><span className="row-icon yellow"><BadgePercent size={17} /></span><div className="flex-grow"><b>{promo.title}</b><small>{promo.code ? `رمز ${promo.code} • ` : ""}{promo.discount_type === "percentage" ? `${promo.discount_value}%` : money(promo.discount_value)} • {promo.is_active ? "مفعّل" : "متوقف"}</small></div><button className="icon-button" onClick={() => void run(async () => { const { error } = await supabase.from("promotions").update({ is_active: !promo.is_active }).eq("id", promo.id); if (error) throw error; }, "تم تحديث حالة العرض.")} aria-label="تفعيل/إيقاف">{promo.is_active ? <X size={16} /> : <Check size={16} />}</button><button className="icon-button danger-icon" onClick={() => removeRow("promotions", promo.id, "العرض")} aria-label="حذف العرض"><Trash2 size={16} /></button></div>)}</div></section></div></section>}

        {tab === "ads" && <section className="admin-content"><div className="split-grid"><section className="admin-card"><div className="card-heading"><div><h3>إعلان شاشة البداية</h3><p>يظهر عند فتح التطبيق، مع زر تخطي بعد المدة التي تختارها.</p></div><BellRing size={22} /></div><form className="admin-form" onSubmit={addAnnouncement}><label>اسم الإعلان<input required value={adForm.title} onChange={(e) => setAdForm({ ...adForm, title: e.target.value })} placeholder="عرض وصلني الجديد" /></label><label>النص أو الكلام المكتوب<textarea rows={3} value={adForm.body} onChange={(e) => setAdForm({ ...adForm, body: e.target.value })} placeholder="اكتب رسالة الإعلان" /></label><label>نوع الوسائط<select value={adForm.media_type} onChange={(e) => setAdForm({ ...adForm, media_type: e.target.value })}><option value="text">نص</option><option value="image">صورة</option><option value="video">فيديو</option></select></label>{adForm.media_type !== "text" && <label className="upload-box"><ImagePlus size={18} /><span>{adForm.file?.name || `اختر ${adForm.media_type === "image" ? "صورة" : "فيديو"}`}</span><input type="file" accept={adForm.media_type === "image" ? "image/*" : "video/*"} onChange={(e) => setAdForm({ ...adForm, file: e.target.files?.[0] || null })} /></label>}<label>مدة الانتظار قبل التخطي (ثوانٍ)<input type="number" min="0" max="60" value={adForm.skip_after_seconds} onChange={(e) => setAdForm({ ...adForm, skip_after_seconds: e.target.value })} /></label><button className="button primary"><Plus size={16} /> حفظ الإعلان</button></form></section><section className="admin-card"><div className="card-heading"><div><h3>الإعلانات</h3><p>شغّل الإعلان أو أوقفه في أي وقت.</p></div></div>{announcements.map((ad) => <div className="ad-card-row" key={ad.id}>{ad.media_url && ad.media_type === "image" ? <img src={ad.media_url} alt="" /> : <span className="row-icon"><Megaphone size={18} /></span>}<div className="flex-grow"><b>{ad.title}</b><small>{ad.media_type === "video" ? "فيديو" : ad.media_type === "image" ? "صورة" : "نص"} • تخطي بعد {ad.skip_after_seconds} ثوانٍ</small></div><button className="icon-button" onClick={() => void run(async () => { const { error } = await supabase.from("announcements").update({ is_active: !ad.is_active }).eq("id", ad.id); if (error) throw error; }, "تم تحديث حالة الإعلان.")}>{ad.is_active ? <X size={16} /> : <Check size={16} />}</button><button className="icon-button danger-icon" onClick={() => removeRow("announcements", ad.id, "الإعلان")}><Trash2 size={16} /></button></div>)}</section></div></section>}

        {tab === "support" && <section className="admin-content"><div className="support-admin-layout"><section className="admin-card support-thread-list"><div className="card-heading"><div><h3>صندوق الدعم</h3><p>رسائل العملاء وردود الفريق والمساعد.</p></div></div>{conversations.length === 0 ? <EmptyState text="لا توجد محادثات حتى الآن." /> : conversations.map((conversation) => <button className={`thread-row ${selectedConversation?.id === conversation.id ? "selected" : ""}`} key={conversation.id} onClick={() => void selectConversation(conversation)}><span className="thread-avatar"><Users size={16} /></span><span><b>{conversation.subject}</b><small>{new Date(conversation.last_message_at).toLocaleString("ar-SA")}</small></span><ArrowLeft size={15} /></button>)}</section><section className="admin-card thread-detail"><div className="card-heading"><div><h3>{selectedConversation?.subject || "اختر محادثة"}</h3><p>{selectedConversation ? `رقم المحادثة ${selectedConversation.id.slice(0, 8)}` : "اختر رسالة من القائمة لعرضها والرد عليها."}</p></div></div>{selectedConversation && <><div className="admin-messages">{messages.map((message) => <div key={message.id} className={`message-bubble ${message.sender_type === "customer" ? "customer-message" : "assistant-message"}`}><span className="message-author">{message.sender_type === "customer" ? "العميل" : message.sender_type === "staff" ? "فريق الدعم" : "المساعد الآلي"}</span>{message.body}</div>)}</div><form className="support-compose admin-compose" onSubmit={sendSupportReply}><input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="اكتب ردك للعميل..." /><button className="send-button" aria-label="إرسال الرد"><ArrowLeft size={17} /></button></form></>}</section></div></section>}

        {tab === "settings" && <section className="admin-content"><section className="admin-card settings-card"><div className="card-heading"><div><h3>إعدادات الخدمة</h3><p>تحكم برسوم التوصيل وحالة استقبال الطلبات.</p></div><Settings2 size={23} /></div><form className="admin-form settings-form" onSubmit={(e) => { e.preventDefault(); saveSettings(); }}><label>رسوم التوصيل (ريال سعودي)<input type="number" min="0" step="0.5" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} /></label><label className="toggle-card"><span><b>استقبال الطلبات</b><small>إيقاف الخدمة يخفي إمكانية إرسال طلب جديد</small></span><input type="checkbox" checked={serviceOpen} onChange={(e) => setServiceOpen(e.target.checked)} /></label><button className="button primary">حفظ الإعدادات</button></form><div className="settings-info"><ShieldCheck size={17} /><p>قاعدة البيانات تفرض الصلاحيات كذلك؛ إخفاء الخيارات في الواجهة ليس هو الحماية الوحيدة. لا يستطيع أي موظف خفض المؤسس أو تعيين مؤسس ثانٍ.</p></div></section></section>}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Gauge; tone: string }) {
  return <article className="stat-card"><span className={`stat-icon ${tone}`}><Icon size={19} /></span><div><small>{label}</small><strong>{value}</strong></div><span className="stat-trend"><ArrowDownRight size={15} /></span></article>;
}

function EmptyState({ text }: { text: string }) { return <div className="empty-state"><span><ClipboardList size={23} /></span><p>{text}</p></div>; }
function roleLabel(role: string) { return ({ customer: "عميل", founder: "المؤسس", admin: "إداري", support: "فريق دعم", courier: "مندوب" } as Record<string, string>)[role] || role; }

function OrderList({ orders, onStatus, couriers, onAssign, empty = "لا توجد طلبات حالياً." }: { orders: Order[]; onStatus: (order: Order, status: string) => void; couriers: Profile[]; onAssign: (order: Order, courier: string) => void; empty?: string }) {
  if (!orders.length) return <EmptyState text={empty} />;
  return <div className="order-list">{orders.map((order) => <article className="order-card" key={order.id}><div className="order-card-top"><span className="order-number">#{order.order_number}</span><span className={`status-chip ${order.status === "pending" ? "warning" : order.status === "delivered" ? "good" : ["rejected", "cancelled"].includes(order.status) ? "bad" : "info"}`}>{statusLabels[order.status] || order.status}</span><time>{new Date(order.created_at).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}</time></div><div className="order-summary"><div className="order-person"><b>{order.customer_name}</b><a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></div><div className="order-kind">{kindLabels[order.order_type]}<b>{money(order.total)}</b></div></div>{order.restaurant_name && <p className="order-route">مطعم: {order.restaurant_name}</p>}{order.pickup_location && <p className="order-route"><MapPinned size={14} /> {order.pickup_location} <ArrowLeft size={13} /> {order.dropoff_location}</p>}{order.request_text && <p className="order-note">{order.request_text}</p>}{order.customer_note && <p className="order-note">ملاحظة: {order.customer_note}</p>}<div className="order-actions"><label className="select-compact">الحالة<select value={order.status} onChange={(e) => onStatus(order, e.target.value)} disabled={["delivered", "rejected", "cancelled"].includes(order.status)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="select-compact">إسناد إلى<select value={order.courier_id || ""} onChange={(e) => onAssign(order, e.target.value)}><option value="">لم يعيّن بعد</option>{couriers.map((courier) => <option key={courier.id} value={courier.id}>{courier.role === "founder" ? "المؤسس (أنا)" : courier.full_name}</option>)}</select></label></div></article>)}</div>;
}
