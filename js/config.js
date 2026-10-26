/**
 * SITE CONFIGURATION
 * -------------------
 * Edit the values below. Nothing else in this file needs to change.
 */
window.SITE_CONFIG = {
  // Paste the URL you get after deploying the Apps Script as a Web App.
  // Steps are in /apps-script/README inside the apps-script folder and in the project README.
  googleSheetWebAppUrl: "https://script.google.com/macros/s/AKfycbwJxXYAmgrCiUgAEvguInH5QDQqi8pvc8XmEsRVrbkm33ZZtS7fGi74kNIqdEP8cmSt4A/exec",

  // Making charge: EGP added per gram. Price = (grams x price per gram) + (grams x this value).
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
  whatsappNumber: "201114547766",

  // Shown in the contact sheet / footer.
  phoneDisplay: "+20 111 454 7766",
  email: "info@gamalabohelal.com",
  instagramUrl: "https://www.facebook.com/share/1Bom8QMPcf/",
  facebookUrl: "https://www.facebook.com/share/1Bom8QMPcf/",
  addressAr: "المحلة الكبرى، مصر",
  addressEn: "El-Mahalla El-Kubra, Egypt",

  // Currency label used next to prices.
  currency: { ar: "ج.م", en: "EGP" },

  // Default language: "ar" (Arabic, default + RTL) or "en".
  defaultLang: "ar"
};
