# Gamal Abo Hel'al — Jewelry Website

A static, no-build website: plain HTML/CSS/JS. Arabic by default (RTL), with an English toggle.
Works on GitHub Pages with zero configuration beyond turning Pages on.

## What's inside

```
index.html              Home page (scroll-driven video story + featured products)
products.html            Full product catalog with filters
css/styles.css           All styling (colors, type, layout — one file)
js/config.js             ← edit this: contact info, WhatsApp number, Google Sheet URL
js/products.js            ← edit this: your product list (name, price, image, category)
js/i18n.js                ← edit this: every piece of text on the site (Arabic + English)
js/components.js         Shared HTML for nav bar, cart drawer, contact sheet, footer
js/cart.js               Cart logic + checkout submission
js/nav.js                Bottom nav + drawer/sheet open-close wiring
js/story.js              Scroll-to-video-time scrubbing for the hero
js/main.js               Boots everything, renders product grids
assets/video/hero.mp4    Your uploaded video
assets/img/logo.png      Your logo with the background removed
assets/img/product-*.jpg  Placeholder product photos (pulled as frames from your video —
                          swap these for real product photography whenever you have it)
apps-script/Code.gs      Google Apps Script — receives orders and writes them to a Sheet
```

## 1. Try it locally first

Because the page uses `fetch()` and video seeking, opening `index.html` directly by
double-clicking it can be flaky in some browsers. Serve it locally instead:

```bash
cd site
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## 2. Edit your content

- **Text (Arabic + English):** everything shown on the site is in `js/i18n.js`, split into
  an `ar` block and an `en` block. Change the Arabic first (it's the default language),
  then update the matching English line so the two stay in sync.
- **Products:** add, remove, or edit items in `js/products.js`. Each product needs a unique
  `id`, a `category` (`necklace`, `bracelet`, or `box`), a price, an image path, and
  Arabic/English name + description.
- **Product photos:** drop new images into `assets/img/` and point to them from
  `js/products.js`. The three placeholder photos are frames pulled from your video —
  replace them with real studio shots whenever you have them.
- **Contact details, WhatsApp number, currency label:** all in `js/config.js`.
- **Colors/fonts:** the whole palette lives at the top of `css/styles.css` under `:root`.
- **The hero video:** replace `assets/video/hero.mp4` with a new export any time. Keep it
  under ~15–20MB so it loads quickly; the three "acts" of on-screen text are timed to
  roughly the first / middle / last third of however long the video is, so you don't need
  to re-time anything if the new video is a similar length.

## 3. Connect orders to a Google Sheet

The checkout form posts an order to a Google Apps Script "Web App" URL, which appends a
row to a Google Sheet. No backend server needed.

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
   (e.g. name it "Gamal Abo Hel'al Orders").
2. In the sheet, open **Extensions → Apps Script**.
3. Delete the placeholder code in the editor, then open `apps-script/Code.gs` from this
   project, copy all of it, and paste it into the Apps Script editor.
4. Click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" and choose **Web app**.
   - Description: anything, e.g. "Order intake".
   - Execute as: **Me**.
   - Who has access: **Anyone**.
5. Click **Deploy**. The first time, Google will ask you to authorize the script —
   approve it (you'll see an "unverified app" warning since it's your own script;
   click **Advanced → Go to project (unsafe)** to continue — this is normal for
   personal Apps Script projects).
6. Copy the **Web app URL** you're given (ends in `/exec`).
7. Open `js/config.js` and paste it into `googleSheetWebAppUrl`.
8. Reload the site and place a test order. A new row should appear in your sheet
   (a tab named "Orders" is created automatically, with headers).

Until you paste a real URL in, checkout still works end-to-end in the browser (so you can
demo the site), it just won't write anywhere — orders will show a success message but
aren't recorded, so don't forget this step before going live.

If the Apps Script call ever fails (offline, misconfigured URL, etc.), the checkout form
automatically falls back to a pre-filled WhatsApp message so no order is silently lost.

## 4. Deploy to GitHub Pages

1. Create a new repository on GitHub (public or private both work for Pages on a
   personal account plan that supports it — public is simplest).
2. From this `site` folder, initialize and push:

   ```bash
   cd site
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

3. On GitHub, open your repo → **Settings → Pages**.
4. Under "Build and deployment", set **Source** to **Deploy from a branch**.
5. Set **Branch** to `main` and folder to `/ (root)`, then **Save**.
6. Wait a minute or two, then your site is live at:

   ```
   https://<your-username>.github.io/<your-repo>/
   ```

Any time you edit files, just `git add . && git commit -m "update" && git push` and
GitHub Pages redeploys automatically within a minute or so.

### Custom domain (optional)
In the same **Settings → Pages** screen you can add a custom domain you own; GitHub
gives you the DNS records to add at your domain registrar.

## Notes on what's built in

- **Language:** Arabic is the default and is right-to-left; the pill button in the top-left
  (top-right in English) swaps the whole site to English/LTR. The choice is remembered
  per visitor (localStorage).
- **Scroll video:** the hero video's playback position is tied to scroll position instead
  of auto-playing — scrolling down moves it forward, scrolling up moves it back. Visitors
  with "reduce motion" turned on in their OS get a normal looping video with static text
  instead, automatically.
- **Cart:** stored in the visitor's browser (localStorage), with a live count badge in the
  bottom nav. Checkout collects name/phone/city/address/notes and posts them as one order.
- **Bottom nav:** fixed, solid black, with Home / Products / Cart / Contact. Contact opens
  a bottom sheet with WhatsApp, phone, email, Instagram and address — all pulled from
  `js/config.js`.
