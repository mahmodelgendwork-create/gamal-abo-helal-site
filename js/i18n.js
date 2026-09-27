/**
 * I18N — Arabic (default) / English
 * ----------------------------------
 * All user-facing copy lives here. Edit freely — every element with a
 * data-i18n="key" attribute is filled from the matching key below.
 * Nested keys use dots, e.g. data-i18n="story.act1.title".
 */
(function () {
  const dict = {
    ar: {
      dir: "rtl",
      nav: { home: "الرئيسية", products: "المنتجات", cart: "السلة", contact: "تواصل" },
      topbar: { langSwitch: "English" },
      story: {
        cue: "استمر بالتمرير",
        act1: {
          eyebrow: "منذ عام ١٩٨٨",
          title: "جمال أبو هلال للمجوهرات",
          body: "ورشة عائلية تتوارث صياغة الذهب جيلاً بعد جيل، نصنع كل قطعة بعناية يدوية داخل القاهرة."
        },
        act2: {
          eyebrow: "الجودة أولاً",
          title: "عيار موثّق، وتشطيب لا يخذل التفاصيل",
          body: "نستخدم ذهب عيار ٢١ و١٨ مدموغ رسميًا، مع فحص لكل حلقة ووصلة قبل أن تصل إلى صندوقها."
        },
        act3: {
          eyebrow: "جاهزة للإهداء",
          title: "من الورشة إلى علبتك المخملية",
          body: "كل قطعة تُغلَّف في علبة العلامة الخاصة بنا وتُسلَّم جاهزة للهدية أو للاحتفاظ بها."
        }
      },
      home: {
        valuesEyebrow: "لماذا تختارنا",
        valuesTitle: "صياغة تستحق أن تبقى",
        values: [
          { title: "ذهب مضمون العيار", body: "كل قطعة مدموغة ومطابقة لعيارها، مع فاتورة وضمان مكتوب." },
          { title: "تصنيع يدوي", body: "نُنجز أعمال اللحام والتلميع يدويًا داخل الورشة، لا سلاسل جاهزة مستوردة." },
          { title: "تغليف فاخر", body: "كل طلب يصل في علبة العلامة التجارية جاهزة للتقديم كهدية." },
          { title: "استبدال وصيانة", body: "نقدّم خدمة تلميع وصيانة لقطعك بعد الشراء بدون تكلفة إضافية." }
        ],
        productsEyebrow: "مختارات",
        productsTitle: "من تشكيلتنا",
        productsBody: "نماذج من القطع المتاحة حاليًا — التشكيلة الكاملة في صفحة المنتجات.",
        viewAll: "عرض كل المنتجات"
      },
      products: {
        eyebrow: "التشكيلة",
        title: "كل المنتجات",
        body: "تصفّح قطعنا من السلاسل والأساور، وأضف ما يعجبك إلى سلتك مباشرة.",
        filters: { all: "الكل", necklace: "سلاسل", bracelet: "أساور", box: "أطقم هدايا" },
        addToCart: "أضف للسلة",
        added: "أُضيفت ✓"
      },
      cart: {
        title: "سلتك",
        emptyTitle: "سلتك فارغة",
        emptyBody: "أضف قطعة من صفحة المنتجات لتبدأ طلبك.",
        browse: "تصفّح المنتجات",
        subtotal: "الإجمالي الفرعي",
        shippingNote: "الشحن يُحدَّد عند التأكيد",
        total: "الإجمالي",
        checkout: "إتمام الطلب",
        backToCart: "الرجوع للسلة",
        formTitle: "بيانات التوصيل",
        name: "الاسم بالكامل",
        phone: "رقم الهاتف",
        address: "العنوان بالتفصيل",
        city: "المحافظة / المدينة",
        notes: "ملاحظات (اختياري)",
        confirm: "تأكيد الطلب",
        sending: "جاري إرسال الطلب…",
        success: "تم استلام طلبك بنجاح! سنتواصل معك قريبًا لتأكيد التفاصيل.",
        errorNetwork: "تعذّر إرسال الطلب تلقائيًا. تواصل معنا مباشرة عبر واتساب لتأكيده:",
        whatsappFallback: "إرسال الطلب عبر واتساب",
        newOrder: "طلب جديد",
        qty: "الكمية"
      },
      contact: {
        title: "تواصل معنا",
        whatsapp: "واتساب",
        whatsappSub: "أسرع وسيلة للرد",
        phone: "اتصال مباشر",
        email: "البريد الإلكتروني",
        instagram: "إنستغرام",
        facebook: "فيسبوك",
        address: "الموقع"
      },
      footer: {
        about: "جمال أبو هلال للمجوهرات — ورشة صياغة ذهب عائلية في القاهرة، متخصصة في القطع الكلاسيكية المصنوعة يدويًا.",
        explore: "تصفّح",
        support: "الدعم",
        rights: "جميع الحقوق محفوظة"
      }
    },

    en: {
      dir: "ltr",
      nav: { home: "Home", products: "Products", cart: "Cart", contact: "Contact" },
      topbar: { langSwitch: "العربية" },
      story: {
        cue: "Keep scrolling",
        act1: {
          eyebrow: "Since 1988",
          title: "Gamal Abo Hel'al Jewelry",
          body: "A family gold workshop passed down through generations. Every piece is finished by hand in our Cairo atelier."
        },
        act2: {
          eyebrow: "Quality first",
          title: "Certified karat, finished down to the last link",
          body: "We work in hallmarked 21k and 18k gold, inspecting every link and clasp before it ever reaches its box."
        },
        act3: {
          eyebrow: "Ready to gift",
          title: "From the workshop to your velvet box",
          body: "Every order is wrapped in our signature packaging, ready to give or to keep."
        }
      },
      home: {
        valuesEyebrow: "Why choose us",
        valuesTitle: "Craft worth keeping",
        values: [
          { title: "Guaranteed karat", body: "Every piece is hallmarked and matches its stated karat, with an invoice and written guarantee." },
          { title: "Handworked", body: "Soldering and polishing happen by hand in our workshop — no imported ready-chains." },
          { title: "Signature packaging", body: "Every order arrives in our branded box, gift-ready from the moment it's opened." },
          { title: "Care included", body: "We polish and service pieces you bought from us afterwards, at no extra cost." }
        ],
        productsEyebrow: "Selected",
        productsTitle: "From our collection",
        productsBody: "A few pieces available right now — see the full range on the products page.",
        viewAll: "View all products"
      },
      products: {
        eyebrow: "Collection",
        title: "All products",
        body: "Browse our necklaces and bracelets, and add anything you like straight to your cart.",
        filters: { all: "All", necklace: "Necklaces", bracelet: "Bracelets", box: "Gift sets" },
        addToCart: "Add to cart",
        added: "Added ✓"
      },
      cart: {
        title: "Your cart",
        emptyTitle: "Your cart is empty",
        emptyBody: "Add a piece from the products page to start your order.",
        browse: "Browse products",
        subtotal: "Subtotal",
        shippingNote: "Shipping confirmed at checkout",
        total: "Total",
        checkout: "Checkout",
        backToCart: "Back to cart",
        formTitle: "Delivery details",
        name: "Full name",
        phone: "Phone number",
        address: "Full address",
        city: "City / governorate",
        notes: "Notes (optional)",
        confirm: "Confirm order",
        sending: "Sending your order…",
        success: "Your order was received! We'll contact you shortly to confirm the details.",
        errorNetwork: "Couldn't send the order automatically. Reach us directly on WhatsApp to confirm it:",
        whatsappFallback: "Send order on WhatsApp",
        newOrder: "New order",
        qty: "Qty"
      },
      contact: {
        title: "Get in touch",
        whatsapp: "WhatsApp",
        whatsappSub: "Fastest way to reach us",
        phone: "Call us",
        email: "Email",
        instagram: "Instagram",
        facebook: "Facebook",
        address: "Location"
      },
      footer: {
        about: "Gamal Abo Hel'al Jewelry — a family gold workshop in Cairo, specialising in handmade classic pieces.",
        explore: "Explore",
        support: "Support",
        rights: "All rights reserved"
      }
    }
  };

  function get(obj, path) {
    return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  }

  function currentLang() {
    return localStorage.getItem("gah_lang") || (window.SITE_CONFIG && window.SITE_CONFIG.defaultLang) || "ar";
  }

  function applyLang(lang) {
    const t = dict[lang] || dict.ar;
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
    document.body.classList.toggle("lang-en", lang === "en");
    document.body.classList.toggle("lang-ar", lang === "ar");

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const val = get(t, el.getAttribute("data-i18n"));
      if (typeof val === "string") el.textContent = val;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const val = get(t, el.getAttribute("data-i18n-placeholder"));
      if (typeof val === "string") el.setAttribute("placeholder", val);
    });

    document.querySelectorAll("[data-lang-switch-label]").forEach((el) => {
      el.textContent = t.topbar.langSwitch;
    });

    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang, t } }));
  }

  function setLang(lang) {
    localStorage.setItem("gah_lang", lang);
    applyLang(lang);
  }

  function toggleLang() {
    setLang(currentLang() === "ar" ? "en" : "ar");
  }

  window.I18N = { dict, currentLang, applyLang, setLang, toggleLang, get };

  document.addEventListener("DOMContentLoaded", () => {
    applyLang(currentLang());
    // Event delegation: the toggle button lives inside a component that's
    // injected after this script runs, so we listen on document instead of
    // querying for the button directly.
    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-lang-toggle]")) toggleLang();
    });
  });
})();
