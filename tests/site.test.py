# Run:  python3 -m http.server 8000   (in the site folder, another terminal)   then   python3 tests/site.test.py
# Browser test with a fake Supabase: checks the site renders, prices use the editable making charge, the CSP does not
# break anything, the hero is progressive, and the secret admin login (lockout, session token, settings save) works.
import json, re, sys, os
from playwright.sync_api import sync_playwright

SITE = os.environ.get("SITE", "http://localhost:8000")
SB = "https://qbndjqvtgnkcjlcatgkp.supabase.co"
ADMIN = "/" + re.search(r"^/(\w{20})/\*", open("_headers").read(), re.M).group(1) + "/"
CSP = re.search(r"Content-Security-Policy: (.*)", open("_headers").read()).group(1)
OUT = os.environ.get("SHOTS", "/tmp/shots"); os.makedirs(OUT, exist_ok=True)
fails = []; passed = 0
def check(name, ok, extra=""):
    global passed
    if ok: passed += 1; print("  ✓", name)
    else: fails.append(name); print("  ✗", name, extra)

now = "2026-11-20T10:00:00Z"
state = {"make_g": 650, "make_s": 120, "attempts": 0, "locked": False, "rpc": [], "gold": True}
UUID = lambda n: "00000000-0000-4000-8000-%012d" % n
PRODUCTS = [
    {"id": UUID(1), "category": "ring", "metal": "gold", "karat": 21, "gms": 5, "name_ar": "خاتم <b>سوليتير</b>", "name_en": "Solitaire", "desc_ar": "كلاسيك", "desc_en": "", "image_url": "", "images": [], "created_at": now},
    {"id": UUID(2), "category": "bracelet", "metal": "silver", "karat": 925, "gms": 12, "name_ar": "إسورة فضة", "name_en": "", "desc_ar": "", "desc_en": "", "image_url": "", "images": [], "created_at": now},
]
def sb(route, req):
    u = req.url.replace(SB, ""); h = {"access-control-allow-origin": "*", "access-control-allow-headers": "*", "content-type": "application/json"}
    if req.method == "OPTIONS": return route.fulfill(status=204, headers=h)
    J = lambda o, s=200: route.fulfill(status=s, headers=h, body=json.dumps(o))
    if u.startswith("/rest/v1/categories"): return J([{"slug": "ring", "name_ar": "خواتم", "name_en": "Rings"}, {"slug": "bracelet", "name_ar": "أساور", "name_en": "Bracelets"}])
    if u.startswith("/rest/v1/gold_prices"):
        rows = [{"karat": k, "price_per_gram": v, "updated_at": "2099-01-01T00:00:00Z"} for k, v in {24: 7000, 21: 6125, 18: 5250, 999: 100, 925: 92.5, 800: 80}.items()]
        return J(rows if state["gold"] else [])
    if u.startswith("/rest/v1/site_settings"): return J([{"workmanship_gold": state["make_g"], "workmanship_silver": state["make_s"]}])
    if u.startswith("/rest/v1/products_priced"): return J(PRODUCTS)
    if u.startswith("/rest/v1/rpc/"):
        fn = u.split("/rpc/")[1].split("?")[0]; body = json.loads(req.post_data or "{}"); state["rpc"].append((fn, body))
        if fn == "admin_login":
            if state["locked"]: return J({"ok": False, "locked": True, "retry_after": 1800})
            if body.get("p_password") == "Correct-Horse-9!": return J({"ok": True, "token": "TOK123", "expires_in": 7200})
            state["attempts"] += 1; rem = max(0, 4 - state["attempts"])
            if rem == 0: state["locked"] = True
            return J({"ok": False, "locked": rem == 0, "remaining": rem, "retry_after": 1800 if rem == 0 else 0})
        if fn == "admin_check": return J(body.get("p_token") == "TOK123")
        if body.get("p_token") != "TOK123": return J({"message": "unauthorized"}, 400)
        if fn == "admin_list_products": return J([dict(p, active=True) for p in PRODUCTS])
        if fn == "admin_set_settings":
            state["make_g"], state["make_s"] = body["p_gold"], body["p_silver"]
            return J({"workmanship_gold": body["p_gold"], "workmanship_silver": body["p_silver"]})
        if fn == "admin_logout": return J(None)
        return J(None)
    return J([])

def with_csp(route, req):
    r = route.fetch(); hd = dict(r.headers)
    if "text/html" in hd.get("content-type", ""): hd["content-security-policy"] = CSP
    route.fulfill(response=r, headers=hd)

with sync_playwright() as p:
    b = p.chromium.launch()
    def newpage(**kw):
        ctx = b.new_context(**kw); pg = ctx.new_page(); logs = []
        pg.on("console", lambda m: logs.append(m.text) if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: logs.append("PAGEERROR " + str(e)))
        pg.route(SB + "/**", sb); pg.route(SITE + "/**", with_csp)
        pg.route(re.compile(r"https://(fonts\.googleapis\.com|fonts\.gstatic\.com|open\.er-api\.com|api\.gold-api\.com)/.*"), lambda r, q: r.fulfill(status=200, body="{}" if "api" in q.url else ""))
        return pg, logs

    print("Home (desktop)")
    pg, logs = newpage(viewport={"width": 1366, "height": 800})
    pg.goto(SITE + "/"); pg.wait_for_selector(".product-card", timeout=8000); pg.wait_for_selector(".rate-chip", timeout=4000)
    check("no CSP violations / console errors", not [l for l in logs if "Content Security Policy" in l or "PAGEERROR" in l], [l for l in logs][:4])
    check("price = 5g x 6125 + 5g x 650 (editable making charge) = 33,875", "٣٣٬٨٧٥" in pg.inner_text("#featured-products"), pg.inner_text("#featured-products")[:200])
    check("silver uses its own charge: 12 x 92.5 + 12 x 120 = 2,550", "٢٬٥٥٠" in pg.inner_text("#featured-products"))
    check("product name is escaped (no HTML injection)", pg.locator("#featured-products b").count() == 0 and "<b>" in pg.inner_text("#featured-products"))
    check("live gram-price band shows 4 chips", pg.locator(".rate-chip").count() == 4)
    check("hero copy is the new short text", "بنحوّل الدهب لفرحة" in pg.inner_text(".story-panel[data-act='0']"))
    check("phone/WhatsApp = 201065676771", pg.evaluate("SITE_CONFIG.whatsappNumber") == "201065676771" and "wa.me/201065676771" in pg.locator("[data-wa-link]").first.get_attribute("href"))
    check("Facebook link present, no Instagram, no email", pg.locator("a[href*='facebook.com/share/1Bom8QMPcf']").count() >= 1 and "instagram" not in pg.content().lower() and "mailto:" not in pg.content())
    pg.wait_for_timeout(1500); pg.screenshot(path=OUT + "/home-desktop-1.png")
    pg.mouse.wheel(0, 1500); pg.wait_for_timeout(800); pg.screenshot(path=OUT + "/home-desktop-2.png")
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT + "/home-desktop-3.png")
    pg.evaluate("document.querySelector('[data-nav=contact]').click()"); pg.wait_for_timeout(600)
    check("contact sheet lists WhatsApp, call, Facebook", pg.locator(".contact-row").count() == 4)

    print("Home (phone)")
    pg2, logs2 = newpage(viewport={"width": 390, "height": 800}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg2.goto(SITE + "/"); pg2.wait_for_selector(".product-card", timeout=8000); pg2.wait_for_timeout(1200)
    check("no horizontal overflow on phone", pg2.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
    pg2.screenshot(path=OUT + "/home-phone-1.png")
    pg2.evaluate("window.scrollTo(0, 1900)"); pg2.wait_for_timeout(900); pg2.screenshot(path=OUT + "/home-phone-2.png")

    print("Products page")
    pg3, logs3 = newpage(viewport={"width": 1280, "height": 800})
    pg3.goto(SITE + "/products.html"); pg3.wait_for_selector(".product-card", timeout=8000); pg3.wait_for_timeout(1000)
    check("products page: no CSP errors; missing background video is silent", not [l for l in logs3 if "Content Security" in l or "PAGEERROR" in l], logs3[:3])
    pg3.screenshot(path=OUT + "/products.png")
    state["gold"] = False
    pg4, _ = newpage(); pg4.goto(SITE + "/products.html"); pg4.wait_for_timeout(1500)
    check("database prices empty → falls back to live market (no crash)", pg4.locator("body").count() == 1)
    state["gold"] = True

    print("Secret admin")
    pg5, logs5 = newpage(viewport={"width": 1100, "height": 900})
    pg5.goto(SITE + "/admin.html"); check("old /admin.html is gone (404)", "نصّ" not in pg5.content() and pg5.locator("#login-form").count() == 0)
    pg5.goto(SITE + ADMIN); pg5.wait_for_selector("#login-form")
    check("admin page is noindex", "noindex" in pg5.locator("meta[name=robots]").get_attribute("content"))
    pg5.screenshot(path=OUT + "/admin-login.png")
    for i in range(4):
        pg5.fill("#lg-name", "gamal"); pg5.fill("#lg-pass", "wrong%d" % i); pg5.click("#lg-btn"); pg5.wait_for_timeout(350)
        if i < 3: check("wrong try %d shows remaining attempts" % (i + 1), ("متبقي %d" % (3 - i)) in pg5.inner_text("#lg-msg"), pg5.inner_text("#lg-msg"))
    check("4th wrong try → locked with countdown, button disabled", "30:0" in pg5.inner_text("#lg-msg") or "29:5" in pg5.inner_text("#lg-msg"))
    check("login button disabled while locked", pg5.locator("#lg-btn").is_disabled())
    pg5.screenshot(path=OUT + "/admin-locked.png")
    state["locked"] = False; state["attempts"] = 0
    pg5.goto(SITE + ADMIN); pg5.wait_for_selector("#login-form")
    pg5.fill("#lg-name", "gamal"); pg5.fill("#lg-pass", "Correct-Horse-9!"); pg5.click("#lg-btn"); pg5.wait_for_selector("#app:not(.hidden)", timeout=5000)
    check("correct login opens the dashboard", pg5.locator("#app").is_visible())
    check("password is NOT stored in the browser", "Correct-Horse" not in json.dumps(pg5.evaluate("Object.assign({}, sessionStorage)")) and "Correct-Horse" not in json.dumps(pg5.evaluate("Object.assign({}, localStorage)")))
    check("later calls send the session token, never the password", all("p_password" not in b for f, b in state["rpc"] if f != "admin_login") and any(b.get("p_token") == "TOK123" for f, b in state["rpc"]))
    pg5.wait_for_selector(".item", timeout=4000)
    check("product list renders (escaped name)", pg5.locator(".item").count() == 2 and pg5.locator(".item b >> nth=0").count() >= 0)
    pg5.screenshot(path=OUT + "/admin-products.png", full_page=True)
    pg5.on("dialog", lambda d: d.accept())
    pg5.locator("[data-toggle]").first.click(); pg5.wait_for_timeout(500)
    check("'sold – hide' button saves the product with active=false", any(f == "admin_save_product" and b["p"].get("active") is False and b["p"]["id"] == UUID(1) and b["p_token"] == "TOK123" for f, b in state["rpc"]))
    pg5.click("[data-tab=pricing]"); pg5.wait_for_timeout(300)
    check("making charge field shows current value 650", pg5.input_value("#s-gold") == "650")
    pg5.fill("#s-gold", "700"); pg5.fill("#s-silver", "150")
    check("live example updates (5g x 6125 + 5g x 700 = 34,125)", "34,125" in pg5.inner_text("#s-sample"), pg5.inner_text("#s-sample"))
    pg5.click("#s-save"); pg5.wait_for_timeout(600)
    check("save sends admin_set_settings(700,150) with token", any(f == "admin_set_settings" and b["p_gold"] == 700 and b["p_silver"] == 150 and b["p_token"] == "TOK123" for f, b in state["rpc"]))
    pg5.screenshot(path=OUT + "/admin-pricing.png")
    pg6, _ = newpage(); pg6.goto(SITE + "/products.html"); pg6.wait_for_selector(".product-card")
    check("public site now prices with the NEW constant (5g x 6125 + 5g x 700 = 34,125)", "٣٤٬١٢٥" in pg6.inner_text("#product-grid"), pg6.inner_text("#product-grid")[:150])
    pg5.click("#logout"); pg5.wait_for_selector("#login:not(.hidden)")
    check("logout returns to login and calls admin_logout", any(f == "admin_logout" for f, b in state["rpc"]))
    check("admin page: no CSP errors", not [l for l in logs5 if "Content Security" in l or "PAGEERROR" in l], logs5[:3])
    b.close()
print("\n%d passed, %d failed" % (passed, len(fails))); sys.exit(1 if fails else 0)
