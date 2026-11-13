# Parcours au NAVIGATEUR (Playwright) des ecrans interactifs (composants Svelte), sur une pile neuve :
# installation par l'ecran /setup, puis Parametres, Utilisateurs, reglages d'un plugin, Ajouter, Compte.
# Complete scripts/e2e-stack.sh, qui verifie l'API et le HTML sans cliquer. Lance par scripts/e2e-ui.sh.
from playwright.sync_api import sync_playwright, expect
import sys
LAN=sys.argv[1]; B=f"http://{LAN}:18080"
SHOTS=sys.argv[2] if len(sys.argv) > 2 else None   # dossier des captures, facultatif
def shot(page, name):
    if SHOTS: page.screenshot(path=f"{SHOTS}/{name}.png", full_page=True)
res=[]
def ok(name, cond): res.append(("OK " if cond else "KO ")+name)
# le pied « Sponsorise par » touche le bas de la page, et la page couvre au moins l'ecran
FOOT_AT_BOTTOM = """() => { const f = document.querySelector('.page-foot'); if (!f) return false;
  const bottom = scrollY + f.getBoundingClientRect().bottom, h = document.documentElement.scrollHeight;
  return Math.abs(bottom - h) < 2 && h >= innerHeight - 1; }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on("pageerror", lambda e: errs.append("pageerror: "+str(e)))
    pg.goto(B+"/setup"); pg.wait_for_load_state("networkidle")
    ok("setup : compte a rebours vivant", pg.locator("#countdown").count()==1)
    pg.check("input[name=kind][value=sqlite]"); pg.click('[data-next="1"]')
    pg.wait_for_selector('section[data-step="2"]:not([hidden])', timeout=10000)
    ok("setup : etape 2 apres SQLite", True)
    ok("setup : noms pre-remplis", pg.input_value("#brokerHost")==LAN)
    pg.fill("#appHost", LAN+":18080"); pg.fill("#adminEmail","ui@exemple.fr"); pg.fill("#adminName","UI"); pg.fill("#adminPassword","ui-mot-de-passe")
    pg.click("#finishBtn")
    pg.wait_for_url("**/connexion?local=1", timeout=240000)
    ok("setup : journal puis connexion", True)
    pg.fill("input[name=user]","ui@exemple.fr"); pg.fill("input[name=pass]","ui-mot-de-passe"); pg.click("button[type=submit]"); pg.wait_for_load_state("networkidle")
    # Parametres
    pg.goto(B+"/parametres"); pg.wait_for_load_state("networkidle")
    pg.fill("#appName","Maison UI"); pg.click('#generalForm button[type=submit]')
    pg.wait_for_function("document.title.includes('Maison UI')", timeout=15000); ok("parametres : nom enregistre", True)
    pg.click('[data-tab="instance"]')
    ok("parametres : onglet Instance", pg.is_visible("#appHost") and not pg.is_visible("#appName"))
    pg.fill("#appHost","nexiste-pas.invalid"); pg.click('#hostForm button[type=submit]')
    pg.wait_for_selector("#hostChecks li.ko", timeout=20000); ok("parametres : adresse refusee, verifications montrees", pg.locator("#hostChecks li.ko").count()>=1)
    # Utilisateurs
    pg.goto(B+"/utilisateurs"); pg.wait_for_load_state("networkidle")
    ok("utilisateurs : la liste d'abord", pg.is_visible('[data-panel="list"]') and not pg.is_visible("#u-email"))
    pg.click('[data-tab="new"]')
    pg.fill("#u-email","bob@exemple.fr"); pg.fill("#u-name","Bob"); pg.fill("#u-pass","bob-mot-de-passe"); pg.click('#userForm button[type=submit]')
    pg.wait_for_selector('[data-del="bob@exemple.fr"]', timeout=15000); ok("utilisateurs : cree, de retour sur la liste", True)
    pg.click('[data-del="bob@exemple.fr"]'); ok("utilisateurs : confirmation dans la page", "bob@exemple.fr" in pg.inner_text('[data-del="bob@exemple.fr"]'))
    pg.click('[data-del="bob@exemple.fr"]'); pg.wait_for_selector('[data-del="bob@exemple.fr"]', state="detached", timeout=15000); ok("utilisateurs : supprime", True)
    # Reglages du plugin comptes locaux
    pg.goto(B+"/plugins/local-accounts"); pg.wait_for_load_state("networkidle")
    pg.check('[data-key="lockoutEnabled"]'); ok("reglages : champ sous la case active", pg.is_enabled('[data-key="lockoutMinutes"]'))
    pg.click('#pluginForm button[type=submit]'); pg.wait_for_selector("#pluginMsg.ok", timeout=10000); ok("reglages : enregistres", True)
    pg.reload(); ok("reglages : relus apres rechargement", pg.is_checked('[data-key="lockoutEnabled"]'))
    # Ajouter
    pg.goto(B+"/ajouter"); pg.wait_for_load_state("networkidle"); pg.click("#pairBtn")
    pg.wait_for_selector("#pairCode:not([hidden])", timeout=10000); ok("ajouter : code obtenu", ":" in pg.inner_text("#pairCode"))
    ok("pied en bas de l'ecran (page courte)", pg.evaluate(FOOT_AT_BOTTOM))
    # Compte : deconnexion
    pg.goto(B+"/compte"); pg.wait_for_load_state("networkidle"); pg.click("#logoutBtn")
    pg.wait_for_url(lambda u: "/compte" not in u, timeout=15000)   # la deconnexion quitte la page
    pg.goto(B+"/compte"); ok("compte : deconnecte", "/connexion" in pg.url)
    ok("pied en bas de l'ecran (connexion)", pg.evaluate(FOOT_AT_BOTTOM))
    # Application installable : un service worker ne s'enregistre que sur une origine sure ; localhost en est une
    L="http://localhost:18080"
    ctx=b.new_context(); pl=ctx.new_page()
    pl.on("pageerror", lambda e: errs.append("pageerror: "+str(e)))
    pl.goto(L+"/connexion?local=1"); pl.fill("input[name=user]","ui@exemple.fr"); pl.fill("input[name=pass]","ui-mot-de-passe"); pl.click("button[type=submit]"); pl.wait_for_load_state("networkidle")
    r=pl.request.post(L+"/api/plugins/enable", data={"id":"installable-app"})
    ok("pwa : plugin active", r.ok)
    import time
    time.sleep(3)
    for _ in range(60):
        try:
            if pl.request.get(L+"/api/setup/status").ok: break
        except Exception: pass
        time.sleep(1)
    pl.goto(L+"/", wait_until="networkidle")
    ok("pwa : la page declare son manifeste", pl.locator('link[rel="manifest"]').count()==1)
    reg=pl.evaluate("() => navigator.serviceWorker.ready.then(r => !!r.active)")
    ok("pwa : service worker enregistre et actif", reg is True)
    # Theme personnalise : couleur au selecteur, icone televersee, applique sans recharger la page
    def restart_wait():
        time.sleep(3)
        for _ in range(60):
            try:
                if pl.request.get(L+"/api/setup/status").ok: return
            except Exception: pass
            time.sleep(1)
    def png_file(w, h):
        import struct, zlib, tempfile
        c=lambda t,d: struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d))
        raw=b''.join(b'\0'+b'\x2a\x9d\x8f'*w for _ in range(h))
        f=tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        f.write(b'\x89PNG\r\n\x1a\n'+c(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+c(b'IDAT',zlib.compress(raw,9))+c(b'IEND',b'')); f.close()
        return f.name
    ok("theme : plugin personnalise active", pl.request.post(L+"/api/plugins/enable", data={"id":"theme-custom"}).ok)
    restart_wait()
    pl.goto(L+"/plugins/theme-custom", wait_until="networkidle")
    pl.fill('[data-key="accent"]', "#2a9d8f")
    pl.set_input_files('[data-key="icon"]', png_file(300, 100))
    pl.wait_for_selector('[data-image-error="icon"]', timeout=5000); ok("theme : icone non carree refusee dans la page", True)
    pl.set_input_files('[data-key="icon"]', png_file(256, 256))
    pl.wait_for_selector('img.preview.square', timeout=5000); ok("theme : apercu de l'icone", pl.locator('[data-image-error="icon"]').count()==0)
    pl.click('#pluginForm button[type=submit]'); pl.wait_for_selector("#pluginMsg.ok", timeout=10000)
    pl.wait_for_function("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()==='#2a9d8f'", timeout=10000)
    ok("theme : couleur appliquee sans recharger", True)
    ok("theme : icone d'onglet du theme", "/pwa/theme-icon?v=" in (pl.get_attribute('link[rel="icon"]', "href") or ""))
    shot(pl, "theme-custom")
    pl.goto(L+"/plugins", wait_until="networkidle")
    ok("plugins : rangés par catégorie, le thème de base au coeur", pl.locator('.plugin-section[data-category="login"]').count()==1 and pl.locator('.plugin-section[data-category="appearance"] .plugin-card[data-state="core"]').count()==1)
    shot(pl, "plugins-desktop")
    pl.click('[data-tab="sources"]'); ok("plugins : onglet Sources", pl.is_visible("#sourcesForm") and not pl.is_visible(".plugin-grid"))
    pl.click('[data-tab="plugins"]'); pl.click('[data-use-theme="isno"]')
    pl.wait_for_selector('[data-theme-in-use="isno"]', timeout=15000); ok("plugins : le theme ISNO se reprend depuis sa carte", True)
    shot(pl, "plugins-sources")
    pl.goto(L+"/utilisateurs", wait_until="networkidle"); shot(pl, "users")
    pl.goto(L+"/parametres#mail", wait_until="networkidle"); ok("parametres : l'ancre ouvre l'onglet", pl.is_visible("#smHost") and not pl.is_visible("#appName")); shot(pl, "settings-mail")
    pl.set_viewport_size({"width": 390, "height": 844}); pl.reload(wait_until="networkidle")
    ok("plugins mobile : pas de defilement horizontal", pl.evaluate("() => document.documentElement.scrollWidth <= innerWidth"))
    shot(pl, "plugins-mobile")
    ctx.close()
    res.append("erreurs JS : "+str(errs))
    b.close()
print("\n".join(res))
sys.exit(0 if all(r.startswith("OK") for r in res[:-1]) and res[-1] == "erreurs JS : []" else 1)
