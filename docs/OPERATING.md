# Operating PokeNow

Notes for running the live site (pokenow.cc). The report Worker has its own guide in [`worker/README.md`](../worker/README.md).

## AdSense setup

AdSense needs the site on its own domain (ads.txt must be served from the domain root), so connect a custom domain first.

0. **Site URL** — set the repository variable `VITE_SITE_URL` (e.g. `https://pokenow.example.com/`) so canonical links and the sitemap use your domain.
1. **Custom domain** — Settings → Pages → Custom domain, then add the DNS records GitHub shows. The build uses relative paths, so no code change is needed.
2. **Repository variables** — Settings → Secrets and variables → Actions → *Variables*:
   - `VITE_ADSENSE_CLIENT` = `ca-pub-…` (your publisher id)
   - after approval, the ad unit ids: `VITE_AD_SLOT_TOP`, `VITE_AD_SLOT_INFEED`, `VITE_AD_SLOT_ANCHOR` (mobile 300×50), `VITE_AD_SLOT_SIDEBAR` (desktop 300×250), `VITE_AD_INFEED_LAYOUT_KEY`
3. **Redeploy** (push to `main` or run the workflow). With `VITE_ADSENSE_CLIENT` set, the build automatically:
   - adds `<meta name="google-adsense-account">` and the AdSense loader to every page,
   - publishes `/ads.txt` with your publisher line.
4. **Apply in AdSense** with the custom domain. `privacy.html` covers the required cookie/ads disclosures.
5. **Consent** — before serving ads, turn on a Google-certified consent message (AdSense → Privacy & messaging) for EEA/UK/Swiss visitors.

Without `VITE_ADSENSE_CLIENT` (or without a slot id), no ad code is loaded and no ad container is rendered at all — dev builds and forks stay ad-free.

Notes:
- Exactly one sticky unit is ever mounted: the **300×50** bottom anchor below 768px, the **300×250** sidebar unit from 1024px. Breakpoint-specific units are mounted only when visible (AdSense errors on hidden slots).
- The sticky anchor uses a fixed **300×50** unit, pinned to the bottom edge on mobile only. AdSense allows only **one sticky ad visible at a time**, so don't also enable Auto ads → Anchor ads while this component is in use.
- In-feed units need the `data-ad-layout-key` from your AdSense code snippet.
- PokeNow doesn't provide or endorse location-changing tools; keep wording that way to stay within Google Publisher Policies.

## Analytics (optional)

Set one repository variable to count page views without cookies: `VITE_CF_ANALYTICS_TOKEN` (Cloudflare Web Analytics) or `VITE_GOATCOUNTER_CODE` (GoatCounter; its hosted free tier is for non-commercial sites).

## Leaving your own visits out of analytics

Open `https://pokenow.cc/?notrack` once in each browser you use; a short note confirms it, and that browser
stops loading the analytics script (stored in `localStorage` as `pokenow:no-analytics`). `?track` turns it back
on. Clearing site data resets it. This only works when the site injects the beacon itself
(`VITE_CF_ANALYTICS_TOKEN`); if Cloudflare's automatic setup also injects a beacon at the edge, turn that off.

