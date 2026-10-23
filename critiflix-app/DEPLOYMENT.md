# Deploying CritiFlix to Render

The backend (Express + MongoDB) is deployed as a single Render **web service**. It
also serves the admin console at `/admin` and uploaded media at `/uploads`. The
**mobile app** is not deployed to Render — you point it at the Render URL and run it
in Expo Go.

## 1. MongoDB (Atlas free tier)
Render does not host MongoDB, so use MongoDB Atlas (free M0):
1. Create a free cluster at mongodb.com/atlas.
2. Database Access → add a user (username + password).
3. Network Access → allow `0.0.0.0/0` (so Render can connect).
4. Connect → Drivers → copy the `mongodb+srv://…` string and append the DB name, e.g. `…mongodb.net/critiflix?retryWrites=true&w=majority`. This is your `MONGODB_URI`.

## 2. Deploy the API (easiest: Blueprint)
1. Push this repo to GitHub (make sure the `server/` folder is committed).
2. Render → **New + → Blueprint** → connect the repo. Render reads `render.yaml`.
3. When prompted, fill the secret values: `MONGODB_URI`, `ADMIN_PASSWORD`, and (optionally) the Twilio + SendGrid + Paystack keys. `JWT_*` secrets are auto-generated.
4. Deploy. When it's live you'll get `https://critiflix-api.onrender.com`.
   - Health check: `https://critiflix-api.onrender.com/api/health`
   - Admin console: `https://critiflix-api.onrender.com/admin`
   - On first boot with an empty DB, the admin account is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### Alternative: deploy without the Blueprint
New Web Service → connect repo → set **Root Directory** = `server`, **Build** = `npm install`, **Start** = `node src/scripts/seed-if-empty.js && node src/index.js`, then add the env vars from `server/.env.example` by hand.

### Alternative: Docker
A self-contained `server/Dockerfile` is included. Use **Root Directory** = (repo root, the folder containing `server/` and `admin/`) and **Dockerfile Path** = `./server/Dockerfile`. Set `SEED_ON_START=true` to seed on first boot. (The native Node path above is simpler and recommended.)

## 3. Twilio (SMS + WhatsApp codes and promos) & Twilio SendGrid (email)
- Twilio Console → **Account Info**: copy `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`.
- Get a phone number with SMS enabled → set `TWILIO_FROM` (E.164, e.g. `+12025550123`).
- WhatsApp: use the Twilio **WhatsApp sandbox** for testing → set `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886` (and join the sandbox from each test phone with the code Twilio gives you). For production, apply for a WhatsApp Business sender in the Twilio Console.
- Email: create a SendGrid API key (Twilio Console → **Email** → **SendGrid**, or directly at sendgrid.com if using a standalone SendGrid account) → set `SENDGRID_API_KEY`. Verify a sender identity or domain in SendGrid, then set `EMAIL_FROM` to that verified address and `EMAIL_FROM_NAME` (defaults to `CritiFlix`).
- Behaviour: with these set, **phone** and **whatsapp** sign-up codes are sent as real SMS/WhatsApp messages, **email** sign-up codes are sent via SendGrid, and admin WhatsApp promotions + email product-update alerts are delivered via Twilio/SendGrid. Without them, codes are logged + returned for testing and WhatsApp promotions fall back to `wa.me` click-to-chat links.

## 4. Paystack (payments)
- Dashboard → Settings → API Keys: set `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` (use `sk_test_…`/`pk_test_…` for testing).
- Set `PAYSTACK_CALLBACK_URL=https://api.critiflix.net/api/me/subscribe/callback`.
- Add a webhook in Paystack pointing to `https://api.critiflix.net/api/webhooks/paystack`. Plans are activated by this webhook. Without keys, subscription/cashout flows simulate.

## 5. Point the mobile app at the API
Builds use `EXPO_PUBLIC_API_BASE` from `mobile/eas.json`, now `https://api.critiflix.net`
(the app also falls back to that address). For local testing put your own value in `mobile/.env`:
```
EXPO_PUBLIC_API_BASE=http://192.168.1.20:4000
```
Then `npx expo start -c`. No trailing slash.

## Notes
- **Free plan sleeps:** the free Render service spins down when idle; the first request after idle takes ~30–50s to wake. Fine for testing.
- **Media lives on Cloudflare R2** once the `R2_*` variables are set (section 6). Without them, uploads fall back to `server/uploads`, which Render wipes on every redeploy or restart.
- Never commit a real `.env`. Use `server/.env.example` as the template; set real values in Render's dashboard.

## 6. critiflix.net + Cloudflare R2 media (October 2026 update)

### Domain
| Address | Points to |
|---|---|
| `critiflix.net`, `www.critiflix.net` | Website (Cloudflare Pages) |
| `api.critiflix.net` | This API on Render (custom domain on the web service). Admin console at `/admin` |
| `media.critiflix.net` | Cloudflare R2 bucket (trailers, posters, avatars, logos) |

1. Render → web service → **Settings → Custom Domains** → add `api.critiflix.net`; add the CNAME it shows in Cloudflare DNS (grey cloud / DNS only).
2. Set `PUBLIC_SITE_URL`, `PUBLIC_API_URL` and `CONTACT_TO` (defaults are already the critiflix.net values in `render.yaml`).
3. Set `EMAIL_FROM=no-reply@critiflix.net` after authenticating `critiflix.net` in SendGrid (**Settings → Sender Authentication → Authenticate a Domain**).
4. The website contact form posts to `https://api.critiflix.net/contact` and is emailed to `CONTACT_TO`.

### Cloudflare R2 (uploads no longer go to the server folder)
1. Cloudflare dashboard → **R2 Object Storage** → **Create bucket** → name `critiflix-media`.
2. Bucket → **Settings → Public access → Custom Domains → Connect domain** → `media.critiflix.net`. Cloudflare adds the DNS record itself.
3. R2 → **Manage API tokens → Create API token** → permission **Object Read & Write**, limited to `critiflix-media`. Copy the **Access Key ID**, **Secret Access Key** and your **Account ID**.
4. Render → Environment: set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (`R2_BUCKET` and `R2_PUBLIC_URL` are pre-filled). Redeploy.
5. Check: `GET https://api.critiflix.net/api/config` shows `"storage": "cloudflare-r2"`.
6. Optional: move older `/uploads/...` media that still exists on your computer:
   ```
   cd server
   node src/scripts/migrate-uploads-to-r2.js           # dry run
   node src/scripts/migrate-uploads-to-r2.js --apply   # upload + rewrite database links
   ```
   Links whose files are already gone are listed so creators can re-upload them.

New uploads return full URLs such as `https://media.critiflix.net/trailers/1729700000000_ab12cd34.mp4`.
Deleting a title, or replacing its trailer or poster, removes the old file from R2.

### Points economy (admin → Points & payouts)
- **Earning benchmark** (default 1000): the first points each critic earns are a benchmark with no cash value. Only points earned after it are cashable. The old rule (no points at all until 50 reviews) is removed.
- **Naira per point** (default ₦0.20): value of each cashable point. It also sets how many points new creator campaigns fund (half the package price ÷ rate).
- Existing critics keep their current cashable balance. Their next earnings count toward the benchmark first.

### Reviews and comments
- One review per critic per title (enforced on the server). After reviewing, the title shows a comment box instead, with no rating and no points.
- Critics comment after reviewing; the title's creator and admins can always comment. Authors, the creator and admins can delete comments. Admin → **Reviews** lists comments for moderation.
- Review, comment and cashout buttons show a spinner and ignore repeat taps while the request is in flight.
