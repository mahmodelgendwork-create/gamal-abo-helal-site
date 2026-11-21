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
          eyebrow: "من ١٩٩٥",
          title: "جمال أبو هلال",
          body: "من ١٩٩٥ بنحوّل الدهب لفرحة. من قلب المحلة لكل بيت في مصر."
        },
        act2: {
          eyebrow: "ذهب وفضة",
          title: "السعر ع المكشوف",
          body: "سعر الجرام لحظة بلحظة، والمصنعية واضحة. تدفع بس اللي تشوفه."
        },
        act3: {
          eyebrow: "اطلب أونلاين",
          title: "اختار. اطلب. خلاص.",
          body: "ضيف قطعتك للسلة، وفريقنا يكلمك يأكد ويرتّب التوصيل."
        }
      },
      home: {
        productsEyebrow: "مختارات",
        productsTitle: "من تشكيلتنا",
        productsBody: "لمحة من التشكيلة. الباقي في صفحة المنتجات.",
        viewAll: "عرض كل المنتجات",
        rateTitle: "سعر الجرام النهاردة",
        rateGold: "ذهب عيار",
        rateSilver: "فضة",
        rateNote: "بيتحدّث تلقائي كل ٣٠ دقيقة",
        whyEyebrow: "ليه إحنا",
        whyTitle: "ذهب تثق فيه. سعر تفهمه.",
        why1t: "عيلة في الدهب من ١٩٩٥",
        why1d: "محلات وورش في المحلة الكبرى، وسمعتنا هي أغلى حاجة عندنا.",
        why2t: "سعر مفهوم",
        why2d: "الوزن × سعر الجرام النهاردة + مصنعية واضحة. من غير مفاجآت.",
        why3t: "طلبك في دقيقة",
        why3d: "اختار من الموقع، وكمّل معانا على واتساب أو بالتليفون.",
        ctaTitle: "عندك سؤال؟ إحنا قريبين.",
        ctaBody: "كلّمنا واتساب أو اتصال، ونساعدك تختار القطعة المناسبة.",
        ctaCall: "اتصل بينا"
      },
      products: {
        eyebrow: "التشكيلة",
        title: "كل المنتجات",
        body: "اختار اللي يعجبك وضيفه للسلة.",
        filters: { all: "الكل", gold: "ذهب", silver: "فضة", necklace: "سلاسل", bracelet: "أساور", box: "أطقم هدايا" },
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
                facebook: "فيسبوك",
        facebookSub: "صفحتنا الرسمية",
        address: "الموقع"
      },
      footer: {
        about: "جمال أبو هلال — محلات وورش ذهب وفضة في المحلة الكبرى، من ١٩٩٥.",
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
          eyebrow: "Since 1995",
          title: "Gamal Abo Hel'al",
          body: "Since 1995 we've turned gold into joy. From the heart of El-Mahalla to homes across Egypt."
        },
        act2: {
          eyebrow: "Gold & silver",
          title: "Gold, priced in the open",
          body: "Live gram price, clear making charge. You pay exactly what you see."
        },
        act3: {
          eyebrow: "Order online",
          title: "Choose. Order. Done.",
          body: "Add your piece to the cart. Our team calls to confirm and arrange delivery."
        }
      },
      home: {
        productsEyebrow: "Selected",
        productsTitle: "From our collection",
        productsBody: "A glimpse of the collection. The rest is on the products page.",
        viewAll: "View all products",
        rateTitle: "Today's gram price",
        rateGold: "Gold",
        rateSilver: "Silver",
        rateNote: "Auto-updated every 30 minutes",
        whyEyebrow: "Why us",
        whyTitle: "Gold you trust. A price you understand.",
        why1t: "A gold family since 1995",
        why1d: "Shops and workshops in El-Mahalla El-Kubra. Our name is our most valuable asset.",
        why2t: "Honest pricing",
        why2d: "Weight × today's gram price + a clear making charge. No surprises.",
        why3t: "Order in a minute",
        why3d: "Pick on the site, then finish with us on WhatsApp or by phone.",
        ctaTitle: "Got a question? We're close.",
        ctaBody: "Message us on WhatsApp or call, and we'll help you choose the right piece.",
        ctaCall: "Call us"
      },
      products: {
        eyebrow: "Collection",
        title: "All products",
        body: "Pick what you love and add it to your cart.",
        filters: { all: "All", gold: "Gold", silver: "Silver", necklace: "Necklaces", bracelet: "Bracelets", box: "Gift sets" },
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
                facebook: "Facebook",
        facebookSub: "Our official page",
        address: "Location"
      },
      footer: {
        about: "Gamal Abo Hel'al — a family chain of gold and silver shops and workshops in El-Mahalla El-Kubra, since 1995.",
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
