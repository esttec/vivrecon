# How to test payments in vivrecon (step by step)

You are testing in **Stripe Sandbox / Test mode**, so **no real money** is ever charged. Take your time — you can't break anything.

You need to do 4 things:
1. Create two prices in Stripe (monthly + yearly)
2. Paste 3 values into one config file
3. Restart the app
4. Click Subscribe and pay with a fake test card

---

## Step 1 — Create the two prices in Stripe

1. Go to **https://dashboard.stripe.com** and log in.
2. Make sure you are in **Sandbox / Test mode** (top of the screen — it should say Test, not Live).
3. In the left menu click **Product catalog** (or **Products**).
4. Click **+ Add product** (top right).
5. Fill in:
   - **Name:** `vivrecon Premium`
   - **Pricing model:** Recurring
   - **Amount:** for example `2.99`, currency **EUR**
   - **Billing period:** **Monthly**
6. Click **Add product** (or **Save**).
7. Open the product you just made. Find the **+ Add another price** button and add a second price:
   - **Amount:** for example `24.99`, currency **EUR**
   - **Billing period:** **Yearly**
   - Save.
8. Now copy the two price IDs. For **each** price, click the **•••** menu next to it (or click the price) and choose **Copy price ID**.
   - It looks like: `price_1AbCdE...`
   - You will have **two** of them — one for monthly, one for yearly. Write down which is which.

---

## Step 2 — Put your values into the config file

Open this file in a text editor (or IntelliJ):

```
C:\vivrecon\backend\vivrecon\src\main\resources\application.yml
```

Find the part that looks like this:

```yaml
  stripe:
    secret-key: ${STRIPE_SECRET_KEY:}
    webhook-secret: ${STRIPE_WEBHOOK_SECRET:}
    price-monthly: ${STRIPE_PRICE_MONTHLY:}
    price-yearly: ${STRIPE_PRICE_YEARLY:}

  app:
    base-url: ${APP_BASE_URL:http://localhost:5173}
```

Change it to look like this — **replace the CAPITAL parts with your real values** (keep the spacing exactly the same):

```yaml
  stripe:
    secret-key: sk_test_PASTE_YOUR_SECRET_KEY_HERE
    webhook-secret: ${STRIPE_WEBHOOK_SECRET:}
    price-monthly: price_PASTE_YOUR_MONTHLY_ID
    price-yearly: price_PASTE_YOUR_YEARLY_ID

  app:
    base-url: http://localhost:3000
```

Notes:
- **secret-key** = the `sk_test_...` key you already added (leave it if it's there).
- **price-monthly / price-yearly** = the two `price_...` IDs from Step 1.
- **base-url** = the address you see in your browser when you use the app. If your app opens at `http://localhost:3000`, use that. If it opens at `http://localhost:5173`, use that instead.
- Leave **webhook-secret** as it is for now.
- **Save the file.**

---

## Step 3 — Restart the app (backend)

Stop the backend and start it again so it picks up the new values:
- In IntelliJ: press the **Stop** (red square), then **Run** (green arrow) again.
- Or in the terminal where it runs: press **Ctrl + C**, then run `./gradlew bootRun` again.

Wait until it says it has started (a line about "Started ... in X seconds").

---

## Step 4 — Test it

1. Open the app in your browser and go to the **Premium** page.
2. Click **Subscribe yearly** (or monthly).
3. You should be taken to a **Stripe payment page** showing card / Apple Pay / Google Pay / PayPal.
4. Pay with this fake **test card**:
   - Card number: **4242 4242 4242 4242**
   - Expiry: any future date, e.g. **12 / 34**
   - CVC: any 3 digits, e.g. **123**
   - Name / postcode: anything
5. Click **Pay**. It should say success and send you back to the app.

That's it — you've seen and tested the whole payment page. 🎉

---

## If you see an error, what it means

- **"Billing is not configured (missing Stripe key)"** → the secret key isn't set. Redo Step 2 (secret-key) and restart.
- **"Stripe price id for 'yearly' is not configured"** → the price IDs aren't set. Redo Step 2 (price-monthly / price-yearly) and restart.
- **The page comes back but you are NOT marked Premium** → that's normal for local testing. Turning Premium on after payment needs one extra piece (a "webhook"). Tell me when you get this far and I'll walk you through it separately — it's a small extra step.

---

## Want me to do the Stripe part for you?

If you connect the **Stripe plugin** (the Connect card I showed in chat), I can create the two prices for you automatically and give you the IDs, so you can skip Step 1. Just say the word.
