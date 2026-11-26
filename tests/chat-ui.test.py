# Browser test of the chatbot UI (Playwright + Chromium). Needs: site on :8000, harness on :8787.
#   python3 -m http.server 8000 &   node --experimental-strip-types tests/dev-chat-server.mjs &   python3 tests/chat-ui.test.py
import json, re, sys, os, urllib.request
from playwright.sync_api import sync_playwright

SITE = "http://localhost:8000"
SB = "qbndjqvtgnkcjlcatgkp.supabase.co"
UUID = lambda n: f"00000000-0000-4000-8000-{n:012d}"
CATS = [{"slug":"ring","name_ar":"خواتم","name_en":"Rings"},{"slug":"necklace","name_ar":"سلاسل","name_en":"Chains & Necklaces"},{"slug":"bracelet","name_ar":"أساور","name_en":"Bracelets"}]
ROWS = [
 {"id":UUID(1),"category":"ring","metal":"gold","karat":21,"gms":5,"name_ar":"خاتم سوليتير","name_en":"Solitaire Ring","desc_ar":"خاتم كلاسيك","desc_en":"Classic ring","image_url":"","images":[],"created_at":"2026-10-01","constant_egp":0},
 {"id":UUID(2),"category":"ring","metal":"gold","karat":18,"gms":3,"name_ar":"خاتم فراشة","name_en":"Butterfly Ring","desc_ar":"","desc_en":"","image_url":"","images":[],"created_at":"2026-10-02","constant_egp":0},
 {"id":UUID(3),"category":"necklace","metal":"gold","karat":21,"gms":10,"name_ar":"سلسلة كابل","name_en":"Cable Chain","desc_ar":"","desc_en":"","image_url":"","images":[],"created_at":"2026-10-03","constant_egp":0},
 {"id":UUID(4),"category":"bracelet","metal":"silver","karat":925,"gms":12,"name_ar":"إسورة فضة","name_en":"Silver Bracelet","desc_ar":"","desc_en":"","image_url":"","images":[],"created_at":"2026-10-04","constant_egp":0},
]
results, fails = [], []
def check(name, cond, extra=""):
    results.append(name)
    print(("  ✓ " if cond else "  ✗ ") + name + (f"   [{extra}]" if (extra and not cond) else ""))
    if not cond: fails.append(name)

held = []
def real_reply(route):
    req = urllib.request.Request("http://localhost:8787/", data=(route.request.post_data or "{}").encode(), headers={"content-type":"application/json"}, method="POST")
    with urllib.request.urlopen(req) as r:
        route.fulfill(status=r.status, content_type="application/json", body=r.read().decode())

def setup(ctx, chat_mode="real", capture=None):
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text and "net::ERR" not in m.text else None)
    for pat in ["**/fonts.googleapis.com/**","**/fonts.gstatic.com/**","**/drive.google.com/**","**/open.er-api.com/**","**/api.gold-api.com/**"]:
        page.route(pat, lambda r: r.abort())
    def rest(route):
        u = route.request.url
        body = CATS if "/categories" in u else ROWS
        route.fulfill(status=200, content_type="application/json", body=json.dumps(body))
    page.route(f"https://{SB}/rest/v1/**", rest)
    def chat(route):
        if capture is not None: capture.append(json.loads(route.request.post_data or "{}"))
        if chat_mode == "503":
            route.fulfill(status=503, content_type="application/json", body=json.dumps({"ok":False,"code":"busy","message":"المساعد مشغول شوية دلوقتي. جرّب تاني بعد دقيقة، أو كلّمنا على واتساب ونساعدك على طول.","whatsapp":True}))
        elif chat_mode == "abort":
            route.abort()
        elif chat_mode == "hold":
            held.append(route)
        else:
            real_reply(route)
    page.route(f"https://{SB}/functions/v1/chat", chat)
    return page, errors

def ready(page, path):
    page.goto(SITE + path); page.wait_for_function("window.PRODUCTS && window.PRODUCTS.length>0"); page.wait_for_selector(".gc-fab")

with sync_playwright() as pw:
    b = pw.chromium.launch()

    print("DESKTOP 1280x800")
    ctx = b.new_context(viewport={"width":1280,"height":800}); sent = []
    page, errors = setup(ctx, capture=sent); ready(page, "/index.html")
    fab = page.locator(".gc-fab"); box = fab.bounding_box(); nav = page.locator(".bottom-nav").bounding_box()
    check("floating button is bottom-right", box["x"] + box["width"] > 1280 - 40 and box["x"] > 640)
    check("button sits above the bottom nav (no overlap)", box["y"] + box["height"] <= nav["y"] - 8, f"{box} {nav}")
    check("button has accessible label", bool(fab.get_attribute("aria-label")))
    page.hover(".gc-fab"); page.screenshot(path="/tmp/shots/d1_closed.png")
    check("panel closed + not focusable at start", page.locator(".gc-panel").evaluate("e=>e.inert && !e.classList.contains('is-open')"))
    fab.click(); page.wait_for_timeout(400)
    check("click opens panel (aria-expanded=true)", fab.get_attribute("aria-expanded") == "true" and page.locator(".gc-panel.is-open").count() == 1)
    first = page.locator(".gc-msg--bot .gc-bubble").first.inner_text()
    check("exact Arabic welcome message", first == "أهلاً بيك! أنا مساعدك في اختيار قطع الذهب المناسبة ليك. تحب تدور على خاتم، سلسلة، أو إسورة؟", first)
    check("empty-state suggestion chips shown", page.locator(".gc-chip").count() == 5)
    check("no AI/model/technical wording shown", not re.search(r"gemini|google|\bAI\b|model|نموذج", page.locator(".gc-panel").inner_text(), re.I))
    check("input focused on desktop open", page.evaluate("document.activeElement.id") == "gc-input")
    page.screenshot(path="/tmp/shots/d2_open.png")
    page.keyboard.press("Escape"); page.wait_for_timeout(350)
    check("Escape closes and returns focus to button", page.locator(".gc-panel.is-open").count() == 0 and page.evaluate("document.activeElement.classList.contains('gc-fab')"))
    fab.click(); page.wait_for_timeout(300); page.locator(".gc-x").click(); page.wait_for_timeout(350)
    check("close (X) button works", page.locator(".gc-panel.is-open").count() == 0)

    fab.click(); page.wait_for_timeout(300)
    page.fill("#gc-input", "عايز خاتم دهب عيار 21"); page.keyboard.press("Enter")
    page.wait_for_selector(".gc-typing", timeout=3000)
    page.wait_for_selector(".gc-card", timeout=8000); page.wait_for_timeout(300)
    check("loading indicator removed after reply", page.locator(".gc-typing").count() == 0)
    check("request carries message + lang", sent and sent[0]["message"] == "عايز خاتم دهب عيار 21" and sent[0]["lang"] == "ar", str(sent))
    check("request does NOT contain any key/secret", "key" not in json.dumps(sent[0]).lower() and "AIza" not in json.dumps(sent[0]))
    check("customer bubble + assistant bubble rendered", page.locator(".gc-msg--user").count() == 1 and page.locator(".gc-msg--bot").count() >= 2)
    check("chips hidden after first message", page.locator(".gc-chip").count() == 0)
    card = page.locator(".gc-card").first; ctext = card.inner_text()
    check("card shows real product name, category, price", "خاتم سوليتير" in ctext and "خواتم" in ctext and "٣٣٬٤١٢" in ctext, ctext)
    check("card has 'View' link to real product page", (card.locator("a.gc-btn").get_attribute("href") or "").endswith("products.html?p=" + UUID(1)))
    check("chat text price == card price (no mismatch)", "٣٣٬٤١٢" in page.locator(".gc-msg--bot .gc-bubble").nth(1).inner_text())
    page.screenshot(path="/tmp/shots/d3_reply.png")

    # follow-up sends history + context ids
    page.fill("#gc-input", "والتاني بكام؟"); page.wait_for_timeout(1300); page.keyboard.press("Enter"); page.wait_for_function("document.querySelectorAll('.gc-msg--bot').length>=3", timeout=8000)
    check("follow-up sends last products as context_ids", len(sent) == 2 and UUID(1) in sent[1]["context_ids"] and len(sent[1]["history"]) >= 2, str(sent[-1])[:300])

    # add to cart from the card
    page.locator(".gc-card .gc-btn--solid").first.click(); page.wait_for_timeout(200)
    badge = page.locator("[data-cart-badge]").first
    check("'Add to cart' on a card uses the site's cart", badge.inner_text().strip() == "1" and "hidden" not in (badge.get_attribute("class") or ""), badge.inner_text())

    # conversation survives navigation (multi-page site)
    page.keyboard.press("Escape"); page.goto(SITE + "/products.html"); page.wait_for_function("window.PRODUCTS.length>0"); page.wait_for_selector(".gc-fab")
    page.locator(".gc-fab").click(); page.wait_for_timeout(300)
    check("conversation is restored on the next page", page.locator(".gc-card").count() >= 1 and page.locator(".gc-msg--user").count() == 2)

    # price consistency with the products page grid
    grid_price = page.locator('[data-product="%s"] .product-price' % UUID(1)).inner_text()
    chat_price = page.locator(".gc-card .gc-card-price").first.inner_text()
    norm = lambda s: re.sub(r"[^\d٠-٩]", "", s)
    check("chat price equals the website grid price", norm(grid_price) == norm(chat_price), f"{grid_price!r} vs {chat_price!r}")

    # View on products page scrolls & highlights, closes panel
    page.locator(".gc-card a.gc-btn").first.click(); page.wait_for_timeout(500)
    check("'View' on products page highlights the product and closes the panel", page.locator('[data-product="%s"].is-pinned' % UUID(1)).count() == 1 and page.locator(".gc-panel.is-open").count() == 0)

    # existing site features still work
    page.locator('[data-nav="cart"]').click(); page.wait_for_timeout(500)
    check("existing cart drawer still opens", page.locator("[data-cart-drawer].is-open").count() == 1)
    check("cart contains the item added from chat", page.locator(".cart-line").count() == 1)
    page.locator("[data-cart-close]").click(); page.wait_for_timeout(300)
    page.locator('[data-nav="contact"]').click(); page.wait_for_timeout(400)
    check("existing contact sheet still opens", page.locator("[data-contact-sheet].is-open").count() == 1)
    page.screenshot(path="/tmp/shots/d4_products.png")

    # deep link from another page
    page.goto(SITE + "/products.html?p=" + UUID(3)); page.wait_for_selector('[data-product="%s"].is-pinned' % UUID(3), timeout=5000)
    check("products.html?p=ID deep link highlights that product", True)

    # language toggle → English
    page.evaluate("localStorage.setItem('gah_lang','en')"); page.goto(SITE + "/index.html"); page.wait_for_selector(".gc-fab")
    page.locator(".gc-fab").click(); page.wait_for_timeout(300)
    check("English UI: LTR panel + English placeholder", page.evaluate("document.documentElement.dir") == "ltr" and page.locator("#gc-input").get_attribute("placeholder") == "Type your message…")
    page.evaluate("sessionStorage.clear()"); page.reload(); page.wait_for_function("window.PRODUCTS.length>0"); page.locator(".gc-fab").click(); page.wait_for_timeout(300)
    check("English welcome", page.locator(".gc-msg--bot .gc-bubble").first.inner_text().startswith("Welcome!"))
    page.locator(".gc-chip").first.click(); page.wait_for_selector(".gc-card", timeout=8000)
    check("English reply + English card (price in EGP)", "EGP" in page.locator(".gc-card").first.inner_text() and "Ring" in page.locator(".gc-card").first.inner_text(), page.locator(".gc-card").first.inner_text())
    page.screenshot(path="/tmp/shots/d5_english.png")
    check("no JavaScript errors on desktop", not errors, str(errors[:3]))
    ctx.close()

    print("LOADING STATE (response held open)")
    ctx = b.new_context(viewport={"width":1280,"height":800}); held.clear(); sent2 = []
    page, errors = setup(ctx, chat_mode="hold", capture=sent2); ready(page, "/index.html")
    page.locator(".gc-fab").click(); page.fill("#gc-input", "عايز خاتم"); page.keyboard.press("Enter"); page.wait_for_selector(".gc-typing")
    check("loading indicator shown while waiting", page.locator(".gc-typing").count() == 1 and page.locator(".gc-log").get_attribute("aria-busy") == "true")
    check("send button disabled while loading", page.locator(".gc-send").is_disabled())
    page.fill("#gc-input", "again"); page.keyboard.press("Enter"); page.wait_for_timeout(200)
    check("a 2nd message is NOT sent while one is pending", len(sent2) == 1)
    real_reply(held[0]); page.wait_for_selector(".gc-card", timeout=8000)
    check("indicator removed and send re-enabled after the reply", page.locator(".gc-typing").count() == 0 and page.locator(".gc-send").is_enabled())
    ctx.close()

    print("ERROR HANDLING")
    ctx = b.new_context(viewport={"width":1280,"height":800}); page, errors = setup(ctx, chat_mode="503"); ready(page, "/index.html")
    page.locator(".gc-fab").click(); page.fill("#gc-input", "عايز خاتم"); page.keyboard.press("Enter"); page.wait_for_selector(".gc-msg--err", timeout=5000)
    check("server 'busy' → friendly Arabic message + WhatsApp button", "مشغول" in page.locator(".gc-msg--err").inner_text() and page.locator(".gc-msg--err a[href^='https://wa.me/201114547766']").count() == 1)
    check("input usable again after error", page.locator(".gc-send").is_enabled())
    ctx.close()
    ctx = b.new_context(viewport={"width":1280,"height":800}); page, errors = setup(ctx, chat_mode="abort"); ready(page, "/index.html")
    page.locator(".gc-fab").click(); page.fill("#gc-input", "hello"); page.keyboard.press("Enter"); page.wait_for_selector(".gc-msg--err", timeout=5000)
    check("network failure → friendly message + WhatsApp, no crash", page.locator(".gc-msg--err a.gc-btn").count() == 1 and not errors, str(errors[:2]))
    page.fill("#gc-input", "x" * 600); 
    check("input hard-limited to 500 characters", page.locator("#gc-input").evaluate("e=>e.value.length") == 500)
    ctx.close()

    print("PHONE 390x844 (iPhone-size, touch)")
    ctx = b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page, errors = setup(ctx); ready(page, "/index.html")
    fab = page.locator(".gc-fab"); box = fab.bounding_box(); nav = page.locator(".bottom-nav").bounding_box()
    check("phone: button fully inside screen, above bottom nav", box["x"] + box["width"] <= 390 and box["y"] + box["height"] <= nav["y"], f"{box} {nav}")
    page.screenshot(path="/tmp/shots/m1_closed.png")
    nav_btns = page.locator(".nav-item").count(); 
    check("phone: bottom navigation still present and clickable", nav_btns == 4 and page.locator('[data-nav="products"]').is_visible())
    fab.tap(); page.wait_for_timeout(500)
    pb = page.locator(".gc-panel").bounding_box()
    check("phone: panel fills the viewport", abs(pb["width"] - 390) < 2 and pb["height"] >= 840 and pb["y"] <= 1, str(pb))
    check("phone: page scroll locked while open", page.evaluate("document.documentElement.classList.contains('gc-lock')"))
    check("phone: keyboard not auto-opened (no forced focus)", page.evaluate("document.activeElement.id") != "gc-input")
    xb = page.locator(".gc-x").bounding_box(); fb = page.locator(".gc-form").bounding_box()
    check("phone: close button and input are on-screen", 0 <= xb["y"] and xb["y"] + xb["height"] <= 844 and fb["y"] + fb["height"] <= 844 + 1 and xb["width"] >= 36)
    page.screenshot(path="/tmp/shots/m2_open.png")
    page.locator(".gc-chip").first.tap(); page.wait_for_selector(".gc-card", timeout=8000); page.wait_for_timeout(400)
    ov = page.locator(".gc-log").evaluate("e=>[e.scrollWidth,e.clientWidth]")
    cb = page.locator(".gc-card").first.bounding_box()
    check("phone: product cards fit the screen (no sideways scroll)", ov[0] <= ov[1] and cb["x"] >= 0 and cb["x"] + cb["width"] <= 390, f"{ov} {cb}")
    page.screenshot(path="/tmp/shots/m3_cards.png")
    # simulate the on-screen keyboard: visual viewport shrinks
    page.evaluate("""()=>{ const vv=window.visualViewport; Object.defineProperty(vv,'height',{value:480,configurable:true}); vv.dispatchEvent(new Event('resize')); }""")
    page.wait_for_timeout(200)
    pb2 = page.locator(".gc-panel").bounding_box(); fb2 = page.locator(".gc-form").bounding_box()
    check("phone: with keyboard up the panel shrinks and input stays visible", pb2["height"] <= 482 and fb2["y"] + fb2["height"] <= 482, f"{pb2} {fb2}")
    page.screenshot(path="/tmp/shots/m4_keyboard.png")
    page.locator(".gc-x").tap(); page.wait_for_timeout(400)
    check("phone: closing releases scroll lock", not page.evaluate("document.documentElement.classList.contains('gc-lock')"))
    check("no JavaScript errors on phone", not errors, str(errors[:3]))
    ctx.close()

    print("TABLET 820x1180")
    ctx = b.new_context(viewport={"width":820,"height":1180}); page, errors = setup(ctx); ready(page, "/products.html")
    page.locator(".gc-fab").click(); page.wait_for_timeout(400); pb = page.locator(".gc-panel").bounding_box()
    check("tablet: floating panel (392px wide) inside the screen", 380 <= pb["width"] <= 395 and pb["x"] + pb["width"] <= 820 and pb["y"] >= 0, str(pb))
    page.screenshot(path="/tmp/shots/t1_tablet.png"); ctx.close()
    b.close()

print(f"\n{len(results)-len(fails)}/{len(results)} UI checks passed")
if fails: print("FAILED:", fails); sys.exit(1)
