# Report Worker

Lets visitors **without a GitHub account** report a translation problem or suggest a hotspot from the
site. Each report becomes a public GitHub issue (labels `translation` / `hotspot-suggestion`).

```
site form ──▶ Cloudflare Turnstile (spam check) ──▶ this Worker ──▶ GitHub issue
```

Everything here runs on free plans. Until both site variables below are set, the site keeps linking
to the GitHub issue forms, so nothing breaks before setup.

## 1. Turnstile (spam check)

Cloudflare dashboard → **Turnstile** → **Add widget**

- Hostnames: `pokenow.cc` (add `localhost` too if you test locally)
- Widget mode: **Managed**
- Copy the **Site key** (public) and the **Secret key** (private).

## 2. GitHub token (lets the Worker open issues)

GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token

- Repository access: **Only select repositories** → `Churious/pokenow`
- Permissions → Repository → **Issues: Read and write** (nothing else)
- Set an expiry you'll remember to renew; copy the token.

## 3. Create the Worker

Cloudflare dashboard → **Workers & Pages** → **Create** → Worker → name it (e.g. `pokenow-report`) →
**Deploy**, then **Edit code**: replace everything with the contents of `report-worker.js` → **Deploy**.

Settings → **Variables and Secrets**:

| Name | Type | Value |
| --- | --- | --- |
| `GITHUB_TOKEN` | Secret | token from step 2 |
| `TURNSTILE_SECRET` | Secret | secret key from step 1 |
| `GITHUB_REPO` | Text | `Churious/pokenow` |
| `ALLOWED_ORIGINS` | Text | `https://pokenow.cc` |

The Worker URL looks like `https://pokenow-report.<your-subdomain>.workers.dev`.

## 4. Turn it on in the site

GitHub repo → Settings → Secrets and variables → Actions → **Variables**:

- `VITE_REPORT_URL` = the Worker URL (no trailing `/report`)
- `VITE_TURNSTILE_SITEKEY` = site key from step 1

Then re-run the deploy workflow (or push to `main`).

## Check it works

Open the site → footer **Report a translation problem** → send a test → an issue appears in the repo.
Close it as a test. If it fails, Workers → your worker → **Logs** shows the request.

## Notes

- Visitor text goes into fenced code blocks, so it can't @mention people or add links/markup.
- Requests must come from `ALLOWED_ORIGINS`, pass Turnstile, and fit the field limits.
- Logic is tested in `report-worker.test.js` (runs with `npm test`).
- Rotate `GITHUB_TOKEN` if it ever leaks: delete it on GitHub and set a new secret.
