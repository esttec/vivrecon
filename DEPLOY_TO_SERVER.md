# Deploy vivrecon to a Hetzner server (vivrecon.com)

This puts the whole app online: **database + backend + frontend + automatic HTTPS**.
I already created the files you need:
- `docker-compose.prod.yml` — runs all 4 parts together
- `frontend/Dockerfile` + `frontend/nginx.conf` — builds and serves the React app
- `Caddyfile` — gives you free HTTPS for vivrecon.com automatically
- `.env.example` — the list of secrets to fill in

Do the steps in order. Take your time. Nothing here can charge you except the ~€4/month server.

---

## Step 1 — Create the server on Hetzner

1. Sign up at **https://console.hetzner.cloud** (Hetzner Cloud).
2. Click **+ New Project** → name it `vivrecon` → open it.
3. Click **Add Server**.
   - **Location:** pick one near you (e.g. Nuremberg or Helsinki).
   - **Image:** **Ubuntu 24.04**
   - **Type:** **Shared vCPU → Arm64 → CAX11** (2 vCPU, 4 GB RAM, ~€3.79/mo). This is plenty.
   - **SSH key:** if you have one, add it. If this is new to you, scroll down and set a **root password** instead (simpler for now).
   - Leave the rest as default.
4. Click **Create & Buy now**.
5. When it's ready, copy the server's **public IP address** (shown on the server's page).

Good news: on Hetzner, ports 80 and 443 are **open by default** — no firewall wrestling like Oracle.

---

## Step 2 — Point vivrecon.com at the server

1. Go to wherever you manage the domain (where you bought vivrecon.com) → DNS settings.
2. Create two **A records**:
   - Name `@` (or blank) → **your server IP**
   - Name `www` → **your server IP**
3. Save. DNS usually updates within minutes (sometimes up to a couple hours).

---

## Step 3 — Connect to the server (SSH)

On Windows, open **PowerShell** and type (replace with your IP):
```
ssh root@YOUR_SERVER_IP
```
- If you set a password, type it when asked.
- First time, it asks "Are you sure…?" → type `yes`.

You're now "inside" the server — the black terminal is the server.

---

## Step 4 — Install Docker

Paste these one at a time:
```
curl -fsSL https://get.docker.com | sh
```
Check it worked:
```
docker --version
docker compose version
```
Both should print a version number.

---

## Step 5 — Get the code onto the server

**If your code is on GitHub** (you have a `.github` folder, so it likely is):
```
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git vivrecon
cd vivrecon
```
**If it's not on GitHub**, copy it from your PC. In a **new** PowerShell window on your computer (not the server one):
```
scp -r C:\vivrecon root@YOUR_SERVER_IP:/root/vivrecon
```
Then back in the server terminal: `cd vivrecon`

Confirm the files are there:
```
ls
```
You should see `docker-compose.prod.yml`, `Caddyfile`, `frontend`, `backend`.

---

## Step 6 — Create your secrets file (.env)

On the server, inside the project folder:
```
cp .env.example .env
nano .env
```
Fill in real values. To make strong random secrets, run this twice in another moment and copy each result:
```
openssl rand -base64 32
```
Use one for `JWT_SECRET`, another for `DB_PASS`.

For Stripe, **start with your TEST values** (the `sk_test_…` key and the two `price_…` IDs you already have) so you can safely check the live site first. You switch to live in Step 9.

Save in nano: **Ctrl+O**, then **Enter**, then **Ctrl+X**.

---

## Step 7 — Start everything

```
docker compose -f docker-compose.prod.yml up -d --build
```
The first build takes a few minutes (it compiles the backend and builds the frontend). When done, check:
```
docker compose -f docker-compose.prod.yml ps
```
Everything should say **running**.

---

## Step 8 — Open your site

Once DNS (Step 2) has updated, go to **https://vivrecon.com**.
Caddy fetches a free HTTPS certificate automatically on the first visit — give it up to a minute. You should see the app with a padlock (secure).

If it doesn't load, double-check Step 2 (DNS points to the right IP) and wait a bit longer for DNS.

To see logs if something looks wrong:
```
docker compose -f docker-compose.prod.yml logs -f
```
(Ctrl+C stops watching logs; it does not stop the app.)

---

## Step 9 — Switch Stripe to LIVE (real payments)

Only after the site works with test payments:
1. In Stripe, turn **Test mode OFF** (go Live). Finish your business profile if asked.
2. Recreate the **product with monthly + yearly prices** in Live mode; copy the new `price_…` IDs.
3. Copy your **Live secret key** (`sk_live_…`).
4. Add a **webhook**: Stripe → Developers → Webhooks → Add endpoint →
   URL `https://vivrecon.com/api/billing/webhook` → choose events
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid`. Copy its **signing secret** (`whsec_…`).
5. Set the **Terms of service URL** to `https://vivrecon.com/terms`
   (Stripe → Settings → Checkout and Payment Links). If you then want the
   "I agree" checkbox back on the payment page, tell me — it's a one-line change.
6. Put the live values into `.env` (edit with `nano .env` again).
7. Apply the changes:
   ```
   docker compose -f docker-compose.prod.yml up -d --build
   ```

Now real customers can pay, and the webhook marks them Premium automatically.

---

## Everyday commands (run inside the project folder on the server)

- Status: `docker compose -f docker-compose.prod.yml ps`
- Logs: `docker compose -f docker-compose.prod.yml logs -f backend`
- After code changes / git pull: `docker compose -f docker-compose.prod.yml up -d --build`
- Stop: `docker compose -f docker-compose.prod.yml down` (your database is safe on a volume)

---

## IMPORTANT security notes

1. **Rotate your Gemini key.** The file `backend/vivrecon/docker-compose.yml` has a real Gemini API key written inside it, so it's exposed in your code and zip files. Make a new key in Google AI Studio, put the new one only in the server `.env`, and delete the old one.
2. **Never commit `.env`** to git. Add a line `.env` to your `.gitignore`.
3. Secrets (Stripe, JWT, database password) now come only from `.env` on the server — good.
4. The CAX11 has 4 GB RAM, so the build has plenty of memory — no extra setup needed.

---

## One note about local testing

I moved the Stripe key out of `application.yml` (it now reads from environment variables — the correct, secure setup). So if you run the app **locally from IntelliJ** again, it will say "Billing is not configured" until you add the Stripe values under **Run → Edit Configurations → Environment variables** (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`). Tell me if you want help wiring that for local runs.
