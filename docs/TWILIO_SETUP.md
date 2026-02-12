# Twilio Setup Guide

This app uses Twilio for **SMS** and **browser-based voice calls** (outbound and incoming).

### Quick reference — env vars

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_ENABLED=true
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**TwiML App:** Voice Request URL = `https://YOUR_API_URL/api/crm/communications/voice/outbound`  
**Phone number:** A CALL COMES IN = `https://YOUR_API_URL/api/crm/communications/voice/inbound`

---

## 1. Create a Twilio account

1. Go to [twilio.com](https://www.twilio.com) and sign up.
2. In the [Twilio Console](https://console.twilio.com):
   - **Account SID** and **Auth Token** are on the dashboard (keep Auth Token secret).
   - Get or buy a **Phone Number**: Phone Numbers → Manage → Buy a number (trial accounts get one free number).

---

## 2. Environment variables

Add these to your `.env` (or `.env.local`). Use the values from the Twilio Console.

### Required (calls + SMS)

| Variable | Where to find it | Example |
|----------|------------------|---------|
| `TWILIO_ACCOUNT_SID` | Console dashboard | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Console dashboard | `your_auth_token` |
| `TWILIO_PHONE_NUMBER` | Phone Numbers → Manage | `+15551234567` (E.164) |
| `TWILIO_ENABLED` | — | `true` |

### Required for browser voice (CRM calling)

Browser voice needs a **TwiML App** (see step 3). After creating it, set:

| Variable | Where to find it | Example |
|----------|------------------|---------|
| `TWILIO_TWIML_APP_SID` | TwiML Apps → your app | `APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |

**Optional but recommended** (for voice access tokens instead of using Auth Token):

| Variable | Where to find it |
|----------|------------------|
| `TWILIO_API_KEY` | Account → API keys → Create API Key |
| `TWILIO_API_SECRET` | Shown once when you create the API Key |

If you omit `TWILIO_API_KEY` / `TWILIO_API_SECRET`, the app uses `TWILIO_AUTH_TOKEN` for tokens (works for development).

### Optional (SMS / A2P)

| Variable | Purpose |
|----------|---------|
| `TWILIO_MESSAGING_SERVICE_SID` | For A2P 10DLC (US business SMS). Create a Messaging Service and attach your number + 10DLC campaign. |

---

## 3. TwiML App (required for browser voice)

Browser calling uses a TwiML App so Twilio knows which URLs to call for **incoming** and **outbound** voice.

1. In Twilio Console go to **Develop → Voice → Manage → TwiML Apps**.
2. Click **Create new TwiML App**.
3. Set **Friendly Name** (e.g. `Auto Buyer CRM`).
4. Set **Voice Request URL** to:  
   `https://YOUR_BACKEND_URL/api/crm/communications/voice/outbound`  
   (This URL is used when the **browser** starts a call via the app.)
5. Save and copy the app **SID** (starts with `AP`) into `TWILIO_TWIML_APP_SID` in your `.env`.

---

## 4. Configure the Twilio phone number (incoming calls)

1. Go to **Phone Numbers → Manage → Active Numbers** and click your number.
2. Under **Voice Configuration**:
   - **A CALL COMES IN:** Webhook, `https://YOUR_BACKEND_URL/api/crm/communications/voice/inbound`, HTTP POST.
3. Save.

Replace `YOUR_BACKEND_URL` with your real API base (e.g. `https://your-app.vercel.app` or `https://your-domain.com`). For local dev use a tunnel (e.g. ngrok: `https://abc123.ngrok.io`).

---

## 5. Local development (optional)

Twilio must reach your backend. If you run the API locally:

1. Use a tunnel, e.g. [ngrok](https://ngrok.com): `ngrok http 8001`
2. Use the ngrok URL as `YOUR_BACKEND_URL` in the Phone Number and TwiML App (e.g. `https://abc123.ngrok.io`).
3. Ensure `.env` has the correct backend URL if the frontend calls it; Twilio only needs the public URLs in the Console.

---

## 6. Summary checklist

- [ ] Twilio account created
- [ ] Phone number purchased or trial number
- [ ] `.env`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_ENABLED=true`
- [ ] TwiML App created; Voice Request URL = `.../voice/outbound`; `TWILIO_TWIML_APP_SID` in `.env`
- [ ] Phone Number “A CALL COMES IN” = `.../voice/inbound`
- [ ] (Optional) `TWILIO_API_KEY` and `TWILIO_API_SECRET` for voice tokens
- [ ] (Optional) `TWILIO_MESSAGING_SERVICE_SID` for SMS 10DLC

Restart the backend after changing `.env`. Then try placing an outbound call from the CRM and, if configured, an incoming call to your Twilio number.
