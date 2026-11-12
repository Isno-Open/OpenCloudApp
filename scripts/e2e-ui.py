# Parcours au NAVIGATEUR (Playwright) des ecrans interactifs (composants Svelte), sur une pile neuve :
# installation par l'ecran /setup, puis Parametres, Utilisateurs, reglages d'un plugin, Ajouter, Compte.
# Complete scripts/e2e-stack.sh, qui verifie l'API et le HTML sans cliquer. Lance par scripts/e2e-ui.sh.
from playwright.sync_api import sync_playwright, expect
import sys
LAN=sys.argv[1]; B=f"http://{LAN}:18080"
res=[]
def ok(name, cond): res.append(("OK " if cond else "KO ")+name)
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
    pg.fill("#appHost","nexiste-pas.invalid"); pg.click('#hostForm button[type=submit]')
    pg.wait_for_selector("#hostChecks li.ko", timeout=20000); ok("parametres : adresse refusee, verifications montrees", pg.locator("#hostChecks li.ko").count()>=1)
    # Utilisateurs
    pg.goto(B+"/utilisateurs"); pg.wait_for_load_state("networkidle")
    pg.fill("#u-email","bob@exemple.fr"); pg.fill("#u-name","Bob"); pg.fill("#u-pass","bob-mot-de-passe"); pg.click('#userForm button[type=submit]')
    pg.wait_for_selector('[data-del="bob@exemple.fr"]', timeout=15000); ok("utilisateurs : cree", True)
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
    # Compte : deconnexion
    pg.goto(B+"/compte"); pg.wait_for_load_state("networkidle"); pg.click("#logoutBtn")
    pg.wait_for_url(lambda u: "/compte" not in u, timeout=15000)   # la deconnexion quitte la page
    pg.goto(B+"/compte"); ok("compte : deconnecte", "/connexion" in pg.url)
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
    ctx.close()
    res.append("erreurs JS : "+str(errs))
    b.close()
print("\n".join(res))
sys.exit(0 if all(r.startswith("OK") for r in res[:-1]) and res[-1] == "erreurs JS : []" else 1)
