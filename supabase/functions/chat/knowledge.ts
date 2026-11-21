/**
 * THE BOT'S KNOWLEDGE — edit this file (plain text), then redeploy:  supabase functions deploy chat --no-verify-jwt
 *
 * Rules the bot follows: it may ONLY state facts that are written here or come live from your product
 * database. Anything not written here, it sends the customer to WhatsApp. So only write what is TRUE.
 *
 * 1) SHOP_FACTS  — short facts always available to the bot (address, hours, delivery...). Leave "" until you know them.
 * 2) FAQ         — question/answer pairs. `keys` are words a customer might use (Arabic or English, any spelling);
 *                  when a message contains one of them, that answer is handed to the bot. Max 3 are used per message.
 */
export const SHOP_FACTS = ``;
// Example once you have the real details (remove the // to enable):
// export const SHOP_FACTS = `- Address: <full address in El-Mahalla El-Kubra>.\n- Opening hours: <days and hours>.\n- Delivery: <areas, price, time>.`;

export const FAQ: { keys: string[]; a: string }[] = [
  {
    keys: ["مصنعيه", "مصنعية", "making charge", "workmanship", "fees"],
    a: "The making charge is a fixed amount per gram added to the gold price of the piece; it is already included in every price shown on the website.",
  },
  {
    keys: ["سعر الجرام", "جرام النهارده", "gram price", "عيار ٢١", "عيار 21"],
    a: "Gram prices on the website update automatically every 30 minutes from the market; each piece's price = weight x gram price + weight x making charge.",
  },
  {
    keys: ["اطلب", "اشتري", "طلب", "order", "checkout", "ادفع", "دفع", "payment"],
    a: "Orders: add pieces to the cart, tap checkout, enter name/phone/city/address, confirm. The team then calls or messages the customer on WhatsApp to confirm the order and delivery. No payment is taken on the website.",
  },
  {
    keys: ["فضه", "فضة", "silver", "925"],
    a: "Silver is available in 800, 925 and 999 purity; silver pieces are priced the same way (weight x silver gram price + making charge).",
  },
  // ➕ Add yours, for example:
  // { keys: ["استبدال", "استرجاع", "exchange", "return"], a: "Exchange policy: <write the real policy here>." },
];
