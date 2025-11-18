# Quick Reference Guide

## 🚀 Getting Started (5 Minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Edit `.env.local` with your credentials:
- Supabase URL and keys
- M-Pesa credentials
- App URL

### 3. Set Up Database
Run the SQL from `supabase-schema.sql` in Supabase SQL Editor

### 4. Start Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

## 📋 Common Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Utilities
node scripts/generate-vouchers.js 100 WIFI    # Generate 100 vouchers
```

## 🔑 Default URLs

- **Home**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Signup**: http://localhost:3000/signup
- **Dashboard**: http://localhost:3000/dashboard
- **Portal**: http://localhost:3000/portal/[your-slug]

## 📊 Dashboard Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/dashboard` | Stats and overview |
| Plans | `/dashboard/plans` | Manage WiFi plans |
| Vouchers | `/dashboard/vouchers` | Upload and manage vouchers |
| Transactions | `/dashboard/transactions` | Payment history |
| Settings | `/dashboard/settings` | Portal configuration |
| Active Users | `/dashboard/users` | Connected users (placeholder) |
| Survey | `/dashboard/survey` | Customer feedback (placeholder) |

## 🔐 Environment Variables Quick Reference

```env
# Supabase (Get from supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# M-Pesa Sandbox (Get from developer.safaricom.co.ke)
MPESA_CONSUMER_KEY=xxx
MPESA_CONSUMER_SECRET=xxx
MPESA_SHORTCODE=174379
MPESA_PASSKEY=xxx
MPESA_CALLBACK_URL=http://localhost:3000/api/mpesa/callback
MPESA_ENVIRONMENT=sandbox

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🧪 M-Pesa Test Credentials

**Sandbox Testing:**
- Phone: `254708374149`
- PIN: `1234`
- Shortcode: `174379`

**Test Flow:**
1. Go to your portal
2. Select a plan
3. Enter test phone number
4. Payment auto-approves in sandbox

## 📝 Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User business info |
| `plans` | WiFi plans |
| `vouchers` | Voucher codes |
| `transactions` | Payment records |

## 🎯 Quick Tasks

### Create a Plan
1. Dashboard → Plans & Packages
2. Click "Add Plan"
3. Fill in details (name, price, duration)
4. Click "Create"

### Upload Vouchers
1. Dashboard → Vouchers
2. Click "Upload Vouchers"
3. Select a plan
4. Paste voucher codes (one per line)
5. Click "Upload"

### Set Up Portal
1. Dashboard → Settings
2. Enter a portal slug (e.g., "my-wifi")
3. Click "Save Settings"
4. Copy and share the portal link

### Generate Vouchers
```bash
node scripts/generate-vouchers.js 100 DAILY
```
Output saved to `output/vouchers-DAILY-[timestamp].txt`

## 🔍 Troubleshooting Quick Fixes

### "Cannot find module" error
```bash
npm install
```

### Supabase connection error
- Check `.env.local` has correct URL and keys
- Verify database schema is deployed

### M-Pesa payment fails
- Verify you're using sandbox credentials
- Check `MPESA_ENVIRONMENT=sandbox`
- Ensure callback URL is accessible

### Portal not found
- Set portal slug in Settings
- Check URL matches: `/portal/[your-slug]`

### Build errors
```bash
rm -rf .next node_modules
npm install
npm run build
```

## 📱 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mpesa/initiate` | POST | Start payment |
| `/api/mpesa/callback` | POST | M-Pesa callback |
| `/api/mpesa/status` | GET | Check payment status |

## 🎨 Customization Points

### Colors (tailwind.config.ts)
```typescript
colors: {
  primary: '#10b981',    // Green
  secondary: '#f59e0b',  // Orange
}
```

### Business Name (app/dashboard/layout.tsx)
```typescript
<h1>Qtro</h1>  // Change this
```

### Portal Branding (app/portal/[slug]/page.tsx)
```typescript
<h1>{businessName}</h1>  // Uses profile.business_name
```

## 📦 File Upload Formats

### Voucher Upload
```
WIFI-ABC123
WIFI-DEF456
WIFI-GHI789
```
One voucher code per line, no commas or headers.

## 🔄 Deployment Quick Steps

### Vercel
1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Update Callback URL
```env
MPESA_CALLBACK_URL=https://your-domain.vercel.app/api/mpesa/callback
```

## 📊 Export Data

### Vouchers
Dashboard → Vouchers → Export button
Downloads: `vouchers-[date].csv`

### Transactions
Dashboard → Transactions → Export button
Downloads: `transactions-[date].csv`

## 🔐 Security Checklist

- [ ] `.env.local` not committed to git
- [ ] Service role key only used server-side
- [ ] RLS policies enabled in Supabase
- [ ] HTTPS enabled in production
- [ ] M-Pesa callback URL secured

## 💡 Pro Tips

1. **Generate vouchers in bulk** using the script
2. **Test payments** in sandbox before going live
3. **Monitor transactions** daily for failed payments
4. **Export data** regularly for backups
5. **Set unique portal slug** that's easy to remember
6. **Share portal link** on social media, WhatsApp
7. **Create multiple plans** for different customer segments
8. **Check Supabase logs** for debugging

## 📞 Support Resources

- **Supabase**: https://supabase.com/docs
- **M-Pesa**: https://developer.safaricom.co.ke/Documentation
- **Next.js**: https://nextjs.org/docs
- **Tailwind**: https://tailwindcss.com/docs

## 🎓 Learning Path

1. ✅ Set up project
2. ✅ Configure Supabase
3. ✅ Get M-Pesa credentials
4. ✅ Create first plan
5. ✅ Upload vouchers
6. ✅ Test payment flow
7. ✅ Deploy to production
8. ✅ Go live!

## 📈 Success Metrics to Track

- Total vouchers sold
- Revenue per day/week/month
- Payment success rate
- Most popular plans
- Customer acquisition cost
- Portal visit conversion rate

## 🔄 Regular Maintenance

**Daily:**
- Check for failed transactions
- Monitor voucher inventory

**Weekly:**
- Review revenue stats
- Export transaction data
- Upload new vouchers if needed

**Monthly:**
- Update dependencies
- Review and optimize plans
- Analyze customer trends

---

**Need more help?** Check the detailed guides:
- `README.md` - Full documentation
- `SETUP.md` - Setup instructions
- `DEPLOYMENT.md` - Deployment guide
- `PROJECT_SUMMARY.md` - Project overview

