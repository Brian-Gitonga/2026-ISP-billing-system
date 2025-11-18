# Quick Setup Guide

## Step 1: Fix PowerShell Execution Policy (Windows)

If you get an error about scripts being disabled, run PowerShell as Administrator and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then close and reopen your terminal.

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (takes ~2 minutes)
3. Go to **Project Settings** > **API**
4. Copy the following:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key (click "Reveal" to see it)

5. Go to **SQL Editor** in the left sidebar
6. Click **New Query**
7. Copy the entire content from `supabase-schema.sql` file
8. Paste it into the SQL editor
9. Click **Run** to execute the SQL

## Step 4: Configure Environment Variables

1. Open `.env.local` file
2. Replace the placeholder values with your actual credentials:

```env
# Supabase (from Step 3)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# M-Pesa Daraja API (see below for how to get these)
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=http://localhost:3000/api/mpesa/callback
MPESA_ENVIRONMENT=sandbox

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 5: Get M-Pesa Sandbox Credentials

1. Go to [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. Click **Sign Up** (or Login if you have an account)
3. Verify your email and complete registration
4. Click **My Apps** > **Create New App**
5. Give your app a name (e.g., "Qtro WiFi")
6. Select **Lipa Na M-Pesa Sandbox** API
7. Click **Create App**
8. You'll see your **Consumer Key** and **Consumer Secret**
9. Click on the app to see the **Test Credentials** section
10. Copy the **Passkey** from the test credentials

**Important**: For sandbox testing:
- Shortcode: `174379` (already in .env.local)
- Test Phone: `254708374149`
- Test PIN: `1234`

## Step 6: Run the Development Server

```bash
npm run dev
```

The application will start at [http://localhost:3000](http://localhost:3000)

## Step 7: Create Your First Account

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **Sign up**
3. Fill in your business details
4. Login to your dashboard

## Step 8: Set Up Your Portal

1. Go to **Settings** in the dashboard
2. Set a **Portal Slug** (e.g., "my-wifi")
3. Click **Save Settings**
4. Copy your portal link
5. Open the portal link in a new tab to test

## Step 9: Create Plans and Upload Vouchers

1. Go to **Plans & Packages**
2. Click **Add Plan**
3. Create a plan (e.g., "Basic Daily - 1GB - KSh 99")
4. Go to **Vouchers**
5. Click **Upload Vouchers**
6. Select the plan you created
7. Enter voucher codes (one per line), for example:
   ```
   WIFI-ABC123
   WIFI-DEF456
   WIFI-GHI789
   ```
8. Click **Upload**

## Step 10: Test the Complete Flow

1. Open your portal link (from Step 8)
2. Select a plan
3. Enter test phone number: `254708374149`
4. Click **Pay**
5. You'll see a success message (in sandbox, payment is auto-approved)
6. The voucher code will be displayed

## Troubleshooting

### "Cannot find module" errors
Run: `npm install`

### Supabase connection errors
- Check your Supabase URL and keys in `.env.local`
- Make sure you ran the SQL schema

### M-Pesa errors
- Verify your Consumer Key and Secret
- Make sure you're using sandbox credentials
- Check that MPESA_ENVIRONMENT is set to "sandbox"

### Portal not found
- Make sure you set a portal slug in Settings
- Check that the slug matches the URL

## Production Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click **Import Project**
4. Select your GitHub repository
5. Add all environment variables from `.env.local`
6. Update these for production:
   - `NEXT_PUBLIC_APP_URL`: Your Vercel URL
   - `MPESA_CALLBACK_URL`: `https://your-domain.vercel.app/api/mpesa/callback`
   - `MPESA_ENVIRONMENT`: Change to `production` when ready
7. Click **Deploy**

### M-Pesa Production Setup

1. Contact Safaricom to apply for production API access
2. Complete their onboarding process
3. Get production credentials
4. Update environment variables in Vercel
5. Register your callback URL with Safaricom

## Need Help?

- Check the main README.md for detailed documentation
- Review Safaricom Developer Portal documentation
- Check Supabase documentation

## Next Steps

- Customize the branding (colors, logo, business name)
- Add more plans
- Upload more vouchers
- Share your portal with customers
- Monitor transactions in the dashboard

