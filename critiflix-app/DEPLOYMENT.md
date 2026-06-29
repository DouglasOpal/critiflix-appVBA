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
3. When prompted, fill the secret values: `MONGODB_URI`, `ADMIN_PASSWORD`, and (optionally) the Twilio + Paystack keys. `JWT_*` secrets are auto-generated.
4. Deploy. When it's live you'll get `https://critiflix-api.onrender.com`.
   - Health check: `https://critiflix-api.onrender.com/api/health`
   - Admin console: `https://critiflix-api.onrender.com/admin`
   - On first boot with an empty DB, the admin account is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### Alternative: deploy without the Blueprint
New Web Service → connect repo → set **Root Directory** = `server`, **Build** = `npm install`, **Start** = `node src/scripts/seed-if-empty.js && node src/index.js`, then add the env vars from `server/.env.example` by hand.

### Alternative: Docker
A self-contained `server/Dockerfile` is included. Use **Root Directory** = (repo root, the folder containing `server/` and `admin/`) and **Dockerfile Path** = `./server/Dockerfile`. Set `SEED_ON_START=true` to seed on first boot. (The native Node path above is simpler and recommended.)

## 3. Twilio (SMS codes + WhatsApp promos)
- Console → **Account Info**: copy `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`.
- Get a phone number with SMS enabled → set `TWILIO_FROM` (E.164, e.g. `+12025550123`).
- WhatsApp: use the Twilio **WhatsApp sandbox** for testing → set `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886` (and join the sandbox from each test phone).
- Behaviour: with these set, **phone** sign-up codes are sent as real SMS and admin WhatsApp promotions are delivered via Twilio. Without them, codes are logged + returned for testing and promotions fall back to `wa.me` click-to-chat links. **Email** sign-up codes are always simulated (returned for testing) until you add an email provider.

## 4. Paystack (payments)
- Dashboard → Settings → API Keys: set `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` (use `sk_test_…`/`pk_test_…` for testing).
- Set `PAYSTACK_CALLBACK_URL=https://<your-service>.onrender.com/api/me/subscribe/callback`.
- Add a webhook in Paystack pointing to `https://<your-service>.onrender.com/api/me/subscribe/webhook` (if your build uses webhooks). Without keys, subscription/cashout flows simulate.

## 5. Point the mobile app at Render
In `mobile/.env`:
```
EXPO_PUBLIC_API_BASE=https://critiflix-api.onrender.com
```
Then `npx expo start -c`. (No `:4000` and no trailing slash — Render serves on 443.)

## Notes
- **Free plan sleeps:** the free Render service spins down when idle; the first request after idle takes ~30–50s to wake. Fine for testing.
- **Uploads are ephemeral on Render's free disk** — files in `server/uploads` are lost on redeploy/restart. For durable media use a persistent disk or move uploads to S3/Cloudinary later.
- Never commit a real `.env`. Use `server/.env.example` as the template; set real values in Render's dashboard.
