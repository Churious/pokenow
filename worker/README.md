# Report Worker

Lets visitors **without a GitHub account** report a translation problem, suggest a hotspot or list a raid
community from the site. Each report becomes a public GitHub issue (labels `translation` / `hotspot-suggestion` /
`community-listing`).

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

## 3. Create the Worker from GitHub (recommended)

The Worker deploys straight from this repo (Cloudflare **Workers Builds**), so code changes merged
into `main` redeploy it automatically. Its config is `worker/wrangler.jsonc`.

Cloudflare dashboard → **Workers & Pages** → **Create** → choose the option to import/connect a Git
repository (GitHub) → pick `Churious/pokenow`, then set:

| Setting | Value |
| --- | --- |
| Project / Worker name | `pokenow-report` (must equal `name` in `wrangler.jsonc`, or the build fails) |
| Production branch | `main` |
| Root directory | `worker` |
| Build command | *(leave empty)* |
| Deploy command | `npx wrangler deploy` (the default) |

Already created the Worker by hand? Open it → **Settings → Builds → Connect** and use the same values.

`GITHUB_REPO` and `ALLOWED_ORIGINS` come from `wrangler.jsonc` (`vars`), so change them there, not in
the dashboard — a deploy can overwrite plain-text variables set in the dashboard (unless `keep_vars`). After the first build,
add the two secrets in the Worker → **Settings → Variables and Secrets** → **Add** → type **Secret**:

| Name | Value |
| --- | --- |
| `ISSUE_TOKEN` | token from step 2 (Cloudflare doesn't allow secret names starting with `GITHUB_`) |
| `TURNSTILE_SECRET` | secret key from step 1 |

Secrets are never put in the repo. "Build variables" in the Builds settings are **not** runtime
variables — don't put the secrets there.

The Worker URL looks like `https://pokenow-report.<your-subdomain>.workers.dev`
(Worker → **Settings → Domains & Routes**).

### Alternative: paste the code

Create a Worker by hand, **Edit code**, paste `report-worker.js`, deploy, and add all four values
under Variables and Secrets (`GITHUB_REPO` = `Churious/pokenow`, `ALLOWED_ORIGINS` =
`https://pokenow.cc` as Text). It won't follow repo changes.

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
- Logic is tested in `report-worker.test.js` (runs with `npm test` from the repo root).
- Check the config without deploying: `cd worker && npx wrangler deploy --dry-run`.
- After a Git deploy, confirm the two secrets are still listed under Variables and Secrets.
- Rotate `ISSUE_TOKEN` if it ever leaks: delete it on GitHub and set a new secret.
