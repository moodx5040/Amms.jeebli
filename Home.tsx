import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgePercent, Bell, ChevronLeft, CircleHelp, Clock3, CreditCard, Download, Flame, Heart, LocateFixed, LogIn, MapPin, MapPinned, Minus, PackageCheck, Plus, Search, ShoppingBag, Sparkles, Truck, UserRound, UtensilsCrossed, X } from "lucide-react";
import AuthDialog from "@/components/AuthDialog";
import SupportPanel from "@/components/SupportPanel";
import AdminDashboard from "@/pages/AdminDashboard";
import { supabase } from "@/lib/supabase";
import type { CartLine, Category, Order, Product, Profile } from "@/lib/types";

const DEMO_CATEGORIES: Category[] = [
  { id: "demo-meals", name: "وجبات الطائف", slug: "meals", description: "اختيارات محلية", image_url: null, kind: "products", sort_order: 1, is_active: true },
  { id: "demo-coffee", name: "قهوة وحلى", slug: "coffee", description: "مزاجك علينا", image_url: null, kind: "products", sort_order: 2, is_active: true },
  { id: "demo-restaurant", name: "اطلب من مطعم", slug: "restaurant", description: "طلبك من مكانك", image_url: null, kind: "restaurant", sort_order: 3, is_active: true },
  { id: "demo-ride", name: "توصيل ومشاوير", slug: "rides", description: "من بابك لبابك", image_url: null, kind: "ride", sort_order: 4, is_active: true },
];
const DEMO_PRODUCTS: Product[] = [
  { id: "demo-p1", category_id: "demo-meals", name: "وجبة دجاج مشوي", description: "دجاج متبل مع أرز وسلطة طازجة", price: 29, image_url: null, spicy_option: true, is_available: true },
  { id: "demo-p2", category_id: "demo-meals", name: "برجر الطائف", description: "لحم مشوي وجبن وصوص البيت", price: 24, image_url: null, spicy_option: false, is_available: true },
  { id: "demo-p3", category_id: "demo-coffee", name: "لاتيه العسل", description: "قهوة محمصة مع لمسة عسل", price: 18, image_url: null, spicy_option: false, is_available: true },
  { id: "demo-p4", category_id: "demo-coffee", name: "كيكة التمر", description: "حلى منزلي يقدم دافئاً", price: 16, image_url: null, spicy_option: false, is_available: true },
];
const demoPromo = { id: "demo", title: "من الطائف، طلبك أقرب", description: "رسوم توصيل تبدأ من 10 ريال — جرّب خدمتنا المحلية", code: "TAIF" };
const money = (value: number) => `${value.toFixed(2)} ر.س`;
const statusLabels: Record<string, string> = { pending: "وصل للمؤسس", accepted: "تم قبول طلبك", preparing: "قيد التجهيز", ready: "جاهز للاستلام", picked_up: "تم استلامه", on_the_way: "في الطريق إليك", delivered: "تم التسليم", rejected: "تعذر قبول الطلب", cancelled: "أُلغي الطلب" };
const kindLabels: Record<string, string> = { products: "المنتجات", ride: "مشوار / توصيل", restaurant: "اطلب من مطعم" };

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<Category[]>(DEMO_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(10);
  const [serviceOpen, setServiceOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);
  const [activeKind, setActiveKind] = useState<"products" | "restaurant" | "ride">("products");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [courierOpen, setCourierOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantPhone, setRestaurantPhone] = useState("");
  const [requestText, setRequestText] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [courierForm, setCourierForm] = useState({ full_name: "", phone: "", vehicle_type: "", note: "" });
  const [courierMessage, setCourierMessage] = useState("");
  const [announcement, setAnnouncement] = useState<any | null>(null);
  const [adCountdown, setAdCountdown] = useState(5);

  const refresh = useCallback(async (userId?: string | null) => {
    setLoading(true);
    const [cats, prods, promos, settings] = await Promise.all([
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("products").select("*").eq("is_available", true).order("sort_order"),
      supabase.from("promotions").select("id,title,description,code,image_url,discount_type,discount_value").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("app_settings").select("key,value").in("key", ["delivery_fee", "service_open"]),
    ]);
    const setupReady = !cats.error && !prods.error && !settings.error;
    setDbReady(setupReady);
    if (cats.data) setCategories(cats.data.length ? cats.data as Category[] : DEMO_CATEGORIES);
    if (prods.data) setProducts(prods.data.length ? prods.data as Product[] : (cats.data?.length ? [] : DEMO_PRODUCTS));
    if (promos.data) setPromotions(promos.data);
    for (const setting of settings.data || []) {
      if (setting.key === "delivery_fee") setDeliveryFee(Number(setting.value?.amount ?? 10));
      if (setting.key === "service_open") setServiceOpen(setting.value === true || setting.value?.open === true);
    }
    if (userId) {
      const [userProfile, userOrders] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("orders").select("*").eq("customer_id", userId).order("created_at", { ascending: false }).limit(10),
      ]);
      if (userProfile.data) {
        setProfile(userProfile.data as Profile);
        setCustomerName((current) => current || userProfile.data.full_name || "");
        setCustomerPhone((current) => current || userProfile.data.phone || "");
      }
      if (userOrders.data) setOrders(userOrders.data as Order[]);
    } else {
      setProfile(null);
      setOrders([]);
    }
    const { data: ads } = await supabase.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1);
    if (ads?.[0] && !sessionStorage.getItem(`waselni-ad-${ads[0].id}`)) {
      setAnnouncement(ads[0]);
      setAdCountdown(Math.max(0, Number(ads[0].skip_after_seconds ?? 5)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      void refresh(data.session?.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (mounted) void refresh(nextSession?.user.id);
    });
    const handler = (event: Event) => setInstallPrompt(event as any);
    window.addEventListener("beforeinstallprompt", handler);
    return () => { mounted = false; listener.subscription.unsubscribe(); window.removeEventListener("beforeinstallprompt", handler); };
  }, [refresh]);

  useEffect(() => {
    if (!announcement || adCountdown <= 0) return;
    const timer = window.setTimeout(() => setAdCountdown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [announcement, adCountdown]);

  const closeAnnouncement = () => {
    if (announcement) sessionStorage.setItem(`waselni-ad-${announcement.id}`, "seen");
    setAnnouncement(null);
  };

  const isFounder = profile?.role === "founder" && profile.email.toLowerCase() === "2008mamms@gmail.com";
  const productCategories = categories.filter((category) => category.kind === "products");
  const filteredProducts = useMemo(() => products.filter((product) => (activeCategory === "all" || product.category_id === activeCategory) && `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase())), [products, activeCategory, search]);
  const cartSubtotal = cart.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
  const promo = promotions.find((item) => item.code && item.code.toUpperCase() === promotionCode.trim().toUpperCase());
  const discount = promo ? promo.discount_type === "fixed" ? Math.min(cartSubtotal, Number(promo.discount_value)) : Math.round(cartSubtotal * Number(promo.discount_value) / 100 * 100) / 100 : 0;
  const total = Math.max(0, cartSubtotal + deliveryFee - discount);
  const activeOrder = orders.find((order) => !["delivered", "rejected", "cancelled"].includes(order.status));

  const addToCart = (product: Product, variant: "normal" | "spicy" | null) => {
    if (product.spicy_option && !variant) { setNotice("اختر المنتج عادي أو حراق أولاً."); return; }
    setNotice("");
    setCart((current) => {
      const match = current.find((line) => line.product.id === product.id && line.variant === variant);
      if (match) return current.map((line) => line === match ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, { product, quantity: 1, variant }];
    });
  };
  const changeQuantity = (productId: string, variant: string | null, delta: number) => setCart((current) => current.map((line) => line.product.id === productId && line.variant === variant ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0));

  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) { setAuthOpen(true); return; }
    if (!dbReady) { setNotice("فعّل قاعدة Supabase أولاً: شغّل ملف supabase/schema.sql من لوحة Supabase."); return; }
    if (!serviceOpen) { setNotice("استقبال الطلبات متوقف حالياً. حاول لاحقاً."); return; }
    setCheckoutBusy(true);
    setNotice("");
    const payload: any = { order_type: activeKind, customer_name: customerName.trim(), customer_phone: customerPhone.trim(), pickup_location: pickupLocation.trim(), dropoff_location: dropoffLocation.trim(), restaurant_name: restaurantName.trim(), restaurant_phone: restaurantPhone.trim(), request_text: activeKind === "restaurant" ? requestText.trim() : activeKind === "ride" ? requestText.trim() : null, customer_note: customerNote.trim(), promotion_code: activeKind === "products" ? promotionCode.trim().toUpperCase() : "" };
    const items = activeKind === "products" ? cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity, variant: line.variant })) : [];
    try {
      const { data, error } = await supabase.rpc("place_order", { p_payload: payload, p_items: items });
      if (error) throw error;
      setNotice(`تم إرسال طلبك رقم ${String(data).slice(0, 8)} للمؤسس. الدفع نقداً عند التسليم.`);
      setCart([]); setCheckoutOpen(false); setCustomerNote(""); setPromotionCode("");
      await refresh(session.user.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "تعذر إرسال الطلب. تحقق من البيانات وحاول مجدداً.");
    } finally { setCheckoutBusy(false); }
  };

  const submitCourier = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) { setAuthOpen(true); return; }
    setCourierMessage("");
    const { error } = await supabase.from("courier_applications").insert({ user_id: session.user.id, ...courierForm });
    if (error) setCourierMessage(error.message);
    else { setCourierMessage("وصل طلبك للمؤسس. بنتواصل معك بعد المراجعة."); setCourierForm({ full_name: "", phone: "", vehicle_type: "", note: "" }); }
  };

  const requestInstall = async () => {
    if (!installPrompt) { setNotice("من Chrome اختر القائمة ⋮ ثم «إضافة إلى الشاشة الرئيسية» لتثبيت التطبيق."); return; }
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const signOut = async () => { await supabase.auth.signOut(); setAccountOpen(false); setNotice("تم تسجيل الخروج."); };

  if (adminOpen && isFounder && profile) return <AdminDashboard profile={profile} onExit={() => setAdminOpen(false)} onRefresh={() => void refresh(session?.user.id)} />;

  return (
    <div className="app-shell" dir="rtl">
      <header className="topbar"><a className="brand-lockup" href="#home" aria-label="وصلني الطائف - الرئيسية"><span className="brand-symbol"><img src={import.meta.env.DEV ? "/manus-storage/async-images/HrNkCjGswbLEEtpdEziy5f/image-1.webp" : "./icons/app-icon.svg"} alt="" onError={(event) => { if (!event.currentTarget.src.endsWith("/icons/app-icon.svg")) event.currentTarget.src = "./icons/app-icon.svg"; }} /></span><span><b>وصلني</b><small>الطائف أقرب</small></span></a><div className="location-pill"><MapPin size={16} /><span><small>موقع التوصيل</small><b>الطائف، السعودية</b></span><ChevronLeft size={15} /></div><div className="top-actions"><button className="button outline install-app-button" onClick={requestInstall}><Download size={15} /><span>حمّل التطبيق</span></button><button className="icon-button favorite-button" aria-label="المفضلة" onClick={() => setNotice("قريباً: قائمة مفضلاتك.")}><Heart size={20} /></button>{session ? <button className="account-button" onClick={() => setAccountOpen(!accountOpen)}><span className="account-avatar"><UserRound size={17} /></span><span className="account-copy"><small>أهلًا</small><b>{profile?.full_name || session.user.email.split("@")[0]}</b></span><ChevronLeft size={15} /></button> : <button className="button primary login-button" onClick={() => setAuthOpen(true)}><LogIn size={16} /> دخول</button>}{accountOpen && <div className="account-menu"><b>{profile?.full_name || "حسابي"}</b><small>{session?.user.email}</small>{isFounder && <button onClick={() => { setAdminOpen(true); setAccountOpen(false); }}><ShieldIcon /> لوحة المؤسس</button>}<button onClick={() => { setCourierOpen(true); setAccountOpen(false); }}><Truck size={16} /> قدّم كمندوب</button><button onClick={() => { setSupportOpen(true); setAccountOpen(false); }}><CircleHelp size={16} /> الدعم والمساعدة</button><button className="account-logout" onClick={signOut}>تسجيل الخروج</button></div>}</div></header>

      <main id="home" className="main-content">
        <section className="welcome-row"><div><p className="eyebrow"><span className="location-pulse" /> أهلًا بك في وصلني</p><h1>من الطائف،<br /><span>طلبك أقرب.</span></h1><p className="welcome-copy">اختر اللي تحتاجه، والباقي علينا.</p></div><div className="welcome-illustration"><div className="hill hill-back" /><div className="hill hill-front" /><span className="pin-large"><MapPin size={27} fill="currentColor" /></span><span className="sun-disc" /></div></section>

        <div className="search-row"><div className="search-box"><Search size={19} /><input aria-label="ابحث عن منتج" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="وش ودك اليوم؟ ابحث هنا" /><kbd>بحث</kbd></div><button className="location-button" onClick={() => setNotice("اكتب وصف موقعك في نموذج الطلب؛ تفعيل الخرائط يحتاج إعداد مزود خرائط.")}><LocateFixed size={18} /><span>موقعي</span></button></div>

        {!dbReady && !loading && <div className="setup-banner"><span><Sparkles size={18} /></span><div><b>معاينة التصميم</b><small>لتفعيل التسجيل والطلبات والبيانات الحية، شغّل <code>supabase/schema.sql</code> في مشروع Supabase.</small></div><button onClick={() => setNotice("افتح Supabase → SQL Editor → New query، ثم الصق ملف supabase/schema.sql كاملاً ونفّذه.")}>طريقة التفعيل <ArrowLeft size={15} /></button></div>}
        {notice && <div className={`notice customer-notice ${notice.startsWith("تم") ? "success-notice" : "info-notice"}`}><span>{notice}</span><button onClick={() => setNotice("")} aria-label="إغلاق"><X size={16} /></button></div>}

        <section className="promo-strip" aria-label="العروض"><div className="promo-main"><div className="promo-copy"><span className="promo-label"><Sparkles size={13} /> محلي وأقرب</span><h2>{promotions[0]?.title || demoPromo.title}</h2><p>{promotions[0]?.description || demoPromo.description}</p>{promotions[0]?.code && <span className="promo-code">استخدم الرمز <b>{promotions[0].code}</b></span>}</div><div className="promo-art"><span className="promo-sparkle s1">✦</span><span className="promo-sparkle s2">✦</span><span className="promo-route"><Truck size={48} /></span><span className="promo-circle" /></div></div><button className="promo-next" onClick={() => setActiveKind("products")} aria-label="تسوق الآن"><ArrowLeft size={19} /></button></section>

        <section className="service-section"><div className="section-heading"><div><p className="eyebrow">كيف نقدر نساعدك؟</p><h2>اختر خدمتك</h2></div><span className="quiet-label">كلها من الطائف</span></div><div className="service-grid">{[
          { kind: "products" as const, title: "اختر منتجاتك", desc: "منتجات ووجبات مختارة", icon: ShoppingBag, style: "service-green" },
          { kind: "restaurant" as const, title: "اطلب من مطعم", desc: "اكتب اسم المطعم وطلبك", icon: UtensilsCrossed, style: "service-gold" },
          { kind: "ride" as const, title: "توصيل ومشاوير", desc: "حدد نقطة الانطلاق والوجهة", icon: Truck, style: "service-blue" },
        ].map(({ kind, title, desc, icon: Icon, style }) => <button key={kind} className={`service-card ${style} ${activeKind === kind ? "selected" : ""}`} onClick={() => { setActiveKind(kind); setActiveCategory("all"); }}><span className="service-icon"><Icon size={22} /></span><span className="service-title">{title}</span><small>{desc}</small><span className="service-arrow"><ArrowLeft size={16} /></span></button>)}</div></section>

        {activeKind === "products" ? <section className="products-section"><div className="section-heading"><div><p className="eyebrow">اختيارات قريبة منك</p><h2>تسوق على مزاجك</h2></div><button className="text-button see-all" onClick={() => setActiveCategory("all")}>عرض الكل <ArrowLeft size={16} /></button></div><div className="category-chips"><button className={activeCategory === "all" ? "active" : ""} onClick={() => setActiveCategory("all")}>الكل <span>{products.length}</span></button>{productCategories.map((category) => <button key={category.id} className={activeCategory === category.id ? "active" : ""} onClick={() => setActiveCategory(category.id)}>{category.name}</button>)}</div><div className="product-grid">{filteredProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} onAdd={addToCart} />)}{filteredProducts.length === 0 && <div className="empty-products"><ShoppingBag size={25} /><b>{dbReady ? "ما فيه منتجات في هذا القسم حالياً" : "الكتالوج سيظهر بعد إعداد قاعدة البيانات"}</b><span>تقدر تضيف الأقسام والمنتجات من لوحة المؤسس.</span></div>}</div></section> : activeKind === "restaurant" ? <section className="request-section"><div className="section-heading"><div><p className="eyebrow">طلبك من مكانك</p><h2>اطلب من مطعمك</h2></div><span className="quiet-label"><UtensilsCrossed size={16} /> طلب حر</span></div><div className="request-card"><div className="request-card-intro"><span className="request-icon gold"><UtensilsCrossed size={22} /></span><div><b>اكتب طلبك بالتفصيل</b><small>المؤسس يستلم طلبك أولاً ويتابع تنفيذه.</small></div></div><form className="customer-order-form" onSubmit={submitOrder}><div className="form-row"><label className="field"><span>اسم المطعم</span><input required value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} placeholder="مثال: مطعم ..." /></label><label className="field"><span>رقم المطعم (اختياري)</span><input type="tel" value={restaurantPhone} onChange={(e) => setRestaurantPhone(e.target.value)} placeholder="05xxxxxxxx" dir="ltr" /></label></div><label className="field"><span>المطعم من وين؟</span><input required value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} placeholder="اسم الحي أو وصف موقع المطعم" /></label><label className="field"><span>طلبك</span><textarea required rows={3} value={requestText} onChange={(e) => setRequestText(e.target.value)} placeholder="اكتب الأصناف والكميات والتفاصيل" /></label><CustomerFields name={customerName} setName={setCustomerName} phone={customerPhone} setPhone={setCustomerPhone} dropoff={dropoffLocation} setDropoff={setDropoffLocation} note={customerNote} setNote={setCustomerNote} /><Invoice fee={deliveryFee} subtotal={0} total={deliveryFee} /><button className="button primary full" disabled={checkoutBusy || !serviceOpen}>{checkoutBusy ? "جارٍ إرسال الطلب..." : `أرسل طلب المطعم • ${money(deliveryFee)} رسوم توصيل`}<ArrowLeft size={18} /></button></form></div></section> : <section className="request-section"><div className="section-heading"><div><p className="eyebrow">مشوارك علينا</p><h2>حدد من وين وإلى وين</h2></div><span className="quiet-label"><MapPinned size={16} /> توصيل محلي</span></div><div className="request-card"><div className="request-card-intro"><span className="request-icon blue"><Truck size={22} /></span><div><b>مشوار من موقع لموقع</b><small>المؤسس يراجع طلبك ويقرر من يتولاه.</small></div></div><form className="customer-order-form" onSubmit={submitOrder}><label className="field"><span>موقع الانطلاق</span><input required value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} placeholder="الحي، اسم المكان أو وصف واضح" /></label><label className="field"><span>الوجهة المطلوبة</span><input required value={dropoffLocation} onChange={(e) => setDropoffLocation(e.target.value)} placeholder="إلى أين تبي نوصلك؟" /></label><CustomerFields name={customerName} setName={setCustomerName} phone={customerPhone} setPhone={setCustomerPhone} note={customerNote} setNote={setCustomerNote} /><label className="field"><span>تفاصيل إضافية (اختياري)</span><textarea rows={2} value={requestText} onChange={(e) => setRequestText(e.target.value)} placeholder="موعد أو تفاصيل تساعدنا" /></label><Invoice fee={deliveryFee} subtotal={0} total={deliveryFee} /><button className="button primary full" disabled={checkoutBusy || !serviceOpen}>{checkoutBusy ? "جارٍ إرسال الطلب..." : `اطلب المشوار • ${money(deliveryFee)}`}<ArrowLeft size={18} /></button></form></div></section>}

        <section className="trust-row"><div><span><ShieldCheckIcon /></span><b>المؤسس يتابع طلبك</b><small>ما يروح للمندوب قبل مراجعته</small></div><div><span><CreditCard size={19} /></span><b>الدفع عند الاستلام</b><small>نقداً، بدون دفع إلكتروني</small></div><div><span><Clock3 size={19} /></span><b>متابعة واضحة</b><small>تعرف حالة طلبك أولاً بأول</small></div></section>

        <section className="bottom-callout"><div><p className="eyebrow light">من أهل الطائف لأهلها</p><h2>توصيل، مشوار، أو طلب خاص؟</h2><p>ابدأ طلبك، وفريق وصلني يتابع الباقي.</p></div><span className="callout-mark"><MapPin size={32} /></span></section>
      </main>

      <nav className="mobile-bottom-nav" aria-label="التنقل"><button className="active" onClick={() => { setActiveKind("products"); window.scrollTo({ top: 0, behavior: "smooth" }); }}><ShoppingBag size={19} /><small>الرئيسية</small></button><button onClick={() => setCheckoutOpen(true)}><span className="nav-cart-icon"><ShoppingBag size={19} />{cart.length > 0 && <i>{cart.length}</i>}</span><small>السلة</small></button><button onClick={() => session ? setNotice(activeOrder ? `طلبك #${activeOrder.order_number}: ${statusLabels[activeOrder.status]}` : "ما عندك طلبات نشطة حالياً.") : setAuthOpen(true)}><PackageCheck size={19} /><small>طلباتي</small></button><button onClick={() => session && profile ? setSupportOpen(true) : setAuthOpen(true)}><CircleHelp size={19} /><small>مساعدة</small></button></nav>

      {cart.length > 0 && activeKind === "products" && <button className="floating-cart" onClick={() => setCheckoutOpen(true)}><span className="cart-badge">{cart.reduce((sum, line) => sum + line.quantity, 0)}</span><ShoppingBag size={19} /><span>السلة</span><b>{money(cartSubtotal)}</b><ArrowLeft size={17} /></button>}

      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} onAuthenticated={() => void refresh()} />}
      {supportOpen && profile && <SupportPanel profile={profile} onClose={() => setSupportOpen(false)} />}
      {supportOpen && !profile && <AuthDialog onClose={() => setSupportOpen(false)} onAuthenticated={() => { setSupportOpen(false); void refresh(); }} />}
      {courierOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setCourierOpen(false)}><section className="form-dialog" role="dialog" aria-modal="true"><button className="icon-button modal-close" onClick={() => setCourierOpen(false)}><X size={20} /></button><span className="request-icon blue"><Truck size={22} /></span><h2>قدّم كمندوب</h2><p className="muted">أرسل بياناتك للمؤسس، والطلبات لا تُسند لك إلا بعد القبول.</p><form className="form-stack" onSubmit={submitCourier}><label className="field"><span>الاسم الكامل</span><input required value={courierForm.full_name} onChange={(e) => setCourierForm({ ...courierForm, full_name: e.target.value })} /></label><label className="field"><span>رقم الجوال</span><input required type="tel" value={courierForm.phone} onChange={(e) => setCourierForm({ ...courierForm, phone: e.target.value })} dir="ltr" /></label><label className="field"><span>نوع المركبة</span><input value={courierForm.vehicle_type} onChange={(e) => setCourierForm({ ...courierForm, vehicle_type: e.target.value })} placeholder="سيارة / دراجة" /></label><label className="field"><span>ملاحظة (اختياري)</span><textarea rows={2} value={courierForm.note} onChange={(e) => setCourierForm({ ...courierForm, note: e.target.value })} /></label>{courierMessage && <div className="notice info-notice">{courierMessage}</div>}<button className="button primary full">إرسال للمؤسس <ArrowLeft size={17} /></button></form></section></div>}
      {checkoutOpen && <div className="modal-backdrop cart-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setCheckoutOpen(false)}><section className="cart-dialog" role="dialog" aria-modal="true"><header className="cart-head"><div><p className="eyebrow">تأكيد طلبك</p><h2>{activeKind === "products" ? "سلة المنتجات" : kindLabels[activeKind]}</h2></div><button className="icon-button" onClick={() => setCheckoutOpen(false)}><X size={20} /></button></header>{activeKind !== "products" ? <div className="notice info-notice">لإرسال طلب مطعم أو مشوار، عبّئ النموذج الموجود أسفل اختيار الخدمة.</div> : cart.length === 0 ? <div className="empty-state"><ShoppingBag size={24} /><b>السلة فارغة</b><button className="text-button" onClick={() => setCheckoutOpen(false)}>اختر منتجاتك <ArrowLeft size={15} /></button></div> : <><div className="cart-items">{cart.map((line) => <div className="cart-line" key={`${line.product.id}-${line.variant}`}><div className="mini-product-art"><ShoppingBag size={18} /></div><div className="cart-line-info"><b>{line.product.name}</b><small>{line.variant === "spicy" ? "حراق" : line.variant === "normal" ? "عادي" : ""} • {money(Number(line.product.price))}</small><div className="quantity-stepper"><button onClick={() => changeQuantity(line.product.id, line.variant, -1)}><Minus size={14} /></button><b>{line.quantity}</b><button onClick={() => changeQuantity(line.product.id, line.variant, 1)}><Plus size={14} /></button></div></div><strong>{money(Number(line.product.price) * line.quantity)}</strong></div>)}</div><form className="customer-order-form cart-form" onSubmit={submitOrder}><CustomerFields name={customerName} setName={setCustomerName} phone={customerPhone} setPhone={setCustomerPhone} dropoff={dropoffLocation} setDropoff={setDropoffLocation} note={customerNote} setNote={setCustomerNote} compact /><label className="field"><span>كود العرض</span><input value={promotionCode} onChange={(e) => setPromotionCode(e.target.value)} placeholder="اكتب الرمز إن وجد" dir="ltr" /></label>{promotionCode && !promo && <small className="validation-hint">إذا كان الكود غير موجود أو منتهي سيرفضه النظام عند الإرسال.</small>}<Invoice fee={deliveryFee} subtotal={cartSubtotal} discount={discount} total={total} /><button className="button primary full" disabled={checkoutBusy || !serviceOpen}>{checkoutBusy ? "جارٍ إرسال الطلب..." : "أرسل الطلب للمؤسس"}<ArrowLeft size={18} /></button><small className="cash-note"><CreditCard size={14} /> الدفع نقداً عند الاستلام</small></form></>}</section></div>}
      {announcement && <div className="modal-backdrop ad-backdrop"><section className="announcement-dialog" role="dialog" aria-modal="true" aria-label={announcement.title}>{announcement.media_type === "image" && announcement.media_url && <img src={announcement.media_url} alt={announcement.title} />}{announcement.media_type === "video" && announcement.media_url && <video src={announcement.media_url} autoPlay muted playsInline />}{announcement.media_type === "text" && <span className="announcement-symbol"><MegaphoneIcon /></span>}<div className="announcement-copy"><span className="eyebrow">إعلان وصلني</span><h2>{announcement.title}</h2><p>{announcement.body}</p></div><button className="button primary full" disabled={adCountdown > 0} onClick={closeAnnouncement}>{adCountdown > 0 ? `تخطي بعد ${adCountdown} ثوانٍ` : "تخطي الإعلان"}</button></section></div>}
      {loading && <div className="loading-indicator"><span /> نجهز لك وصلني...</div>}
    </div>
  );
}

function CustomerFields({ name, setName, phone, setPhone, dropoff, setDropoff, note, setNote, compact = false }: { name: string; setName: (value: string) => void; phone: string; setPhone: (value: string) => void; dropoff?: string; setDropoff?: (value: string) => void; note: string; setNote: (value: string) => void; compact?: boolean }) {
  return <><div className="form-row"><label className="field"><span>اسم العميل</span><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" autoComplete="name" /></label><label className="field"><span>رقم الجوال</span><input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" dir="ltr" autoComplete="tel" /></label></div>{dropoff !== undefined && setDropoff && <label className="field"><span>موقع العميل / التوصيل</span><input required value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder="الحي واسم الشارع أو وصف الموقع" /></label>}<label className="field"><span>ملاحظات {compact ? "للمندوب" : "إضافية"} (اختياري)</span><textarea rows={compact ? 2 : 2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="رقم المبنى أو أي توضيح" /></label></>;
}

function Invoice({ fee, subtotal, discount = 0, total }: { fee: number; subtotal: number; discount?: number; total: number }) {
  return <div className="invoice-card"><div><span>قيمة المنتجات</span><b>{money(subtotal)}</b></div><div><span>رسوم التوصيل</span><b>{money(fee)}</b></div>{discount > 0 && <div className="discount-line"><span>الخصم</span><b>− {money(discount)}</b></div>}<div className="invoice-total"><strong>الإجمالي التقديري</strong><strong>{money(total)}</strong></div><small>الدفع نقداً عند التسليم. قد تتغير قيمة الطلب الحر بعد مراجعة المؤسس.</small></div>;
}

function ProductCard({ product, index, onAdd }: { product: Product; index: number; onAdd: (product: Product, variant: "normal" | "spicy" | null) => void }) {
  const [variant, setVariant] = useState<"normal" | "spicy" | null>(product.spicy_option ? "normal" : null);
  return <article className="product-card"><div className={`product-art art-${index % 4}`}>{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <div className="product-placeholder"><span>{index % 2 === 0 ? <UtensilsCrossed size={31} /> : <ShoppingBag size={30} />}</span><i /><i /></div>}<button className="product-heart" aria-label="إضافة للمفضلة"><Heart size={17} /></button>{product.spicy_option && <span className="spicy-badge"><Flame size={12} /> خيارات حرارة</span>}</div><div className="product-content"><div className="product-title-row"><h3>{product.name}</h3><strong>{money(Number(product.price))}</strong></div><p>{product.description || "اختيار لذيذ من الطائف"}</p>{product.spicy_option && <div className="heat-options"><button className={variant === "normal" ? "active" : ""} onClick={() => setVariant("normal")}>عادي</button><button className={variant === "spicy" ? "active" : ""} onClick={() => setVariant("spicy")}>حراق <Flame size={12} /></button></div>}<button className="add-product-button" onClick={() => onAdd(product, variant)}><Plus size={17} /><span>أضف للسلة</span></button></div></article>;
}

function ShieldIcon() { return <ShieldCheckIcon />; }
function ShieldCheckIcon() { return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></svg>; }
function MegaphoneIcon() { return <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 13v-2Z"/><path d="M11.6 14.9 13 21l-4-1-1.1-6.6M5 13v5"/></svg>; }
