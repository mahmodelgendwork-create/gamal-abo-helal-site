/**
 * SITE CONFIGURATION
 * -------------------
 * Edit the values below. Nothing else in this file needs to change.
 */
window.SITE_CONFIG = {
  // Paste the URL you get after deploying the Apps Script as a Web App.
  // Steps are in DEPLOY.md (part 4).
  googleSheetWebAppUrl: "https://script.google.com/macros/s/AKfycbwJxXYAmgrCiUgAEvguInH5QDQqi8pvc8XmEsRVrbkm33ZZtS7fGi74kNIqdEP8cmSt4A/exec",

  // Making charge (EGP per gram) is now edited from the admin page and stored in the database.
  // These numbers are ONLY a safety net used if the database cannot be reached.
  workmanshipPerGram: { gold: 500, silver: 500 },

  // Optional: type a gold price per gram (EGP) to override the automatic one, e.g. { 21: 6300 }.
  // Leave as {} to use the automatic price.
  goldPriceOverride: {},
  // Same for silver, by purity: e.g. { 925: 95 }. Leave as {} for the automatic price.
  silverPriceOverride: {},

  // Database (Supabase). Project Settings -> API. The publishable/anon key is meant to be public.
  supabaseUrl: "https://qbndjqvtgnkcjlcatgkp.supabase.co",
  supabaseAnonKey: "sb_publishable_tJF8wLLtgU4kmTTPJjflSA_K5rmlSnr",

  // Chatbot backend (Supabase Edge Function "chat"). No secrets here — the Gemini key lives on the server.
  // Leave as is if you deploy the function in the same Supabase project (see CHATBOT.md).
  chatApiUrl: "https://qbndjqvtgnkcjlcatgkp.supabase.co/functions/v1/chat",

  // WhatsApp number in international format, digits only (no +, spaces or dashes).
  whatsappNumber: "201065676771",

  // Shown in the contact sheet / footer.
  phoneDisplay: "+20 106 567 6771",
  // Leave email empty ("") to hide it everywhere. Add one only when the shop has a real mailbox.
  email: "",
  facebookUrl: "https://www.facebook.com/share/1Bom8QMPcf/",
  addressAr: "المحلة الكبرى، مصر",
  addressEn: "El-Mahalla El-Kubra, Egypt",

  // Currency label used next to prices.
  currency: { ar: "ج.م", en: "EGP" },

  // Default language: "ar" (Arabic, default + RTL) or "en".
  defaultLang: "ar"
};
