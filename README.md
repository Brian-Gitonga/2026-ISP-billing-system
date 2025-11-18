# Qtro WiFi - Voucher Management System

A complete voucher management and selling system for MikroTik and TP-Link routers with M-Pesa payment integration.

## Features

- 🔐 **User Authentication** - Secure login and signup with Supabase Auth
- 📊 **Dashboard** - Real-time statistics and analytics
- 🎫 **Voucher Management** - Upload, manage, and track WiFi vouchers
- 💰 **M-Pesa Integration** - STK Push payment processing
- 🌐 **Public Portal** - Shareable portal for customers to buy vouchers
- 📦 **Plan Management** - Create and manage daily, weekly, and monthly plans
- 💳 **Transaction Tracking** - Complete payment and sales history
- 📱 **Mobile Responsive** - Works perfectly on all devices

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Payment**: M-Pesa Daraja API
- **Deployment**: Vercel (recommended)

## Prerequisites

- Node.js 18+ installed
- Supabase account
- M-Pesa Daraja API credentials (sandbox or production)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your credentials
3. Go to SQL Editor and run the SQL from `supabase-schema.sql`

### 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# M-Pesa Daraja API
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_ENVIRONMENT=sandbox  # or 'production'

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Get M-Pesa Credentials

#### For Testing (Sandbox):
1. Go to [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. Create an account and login
3. Create a new app
4. Select "Lipa Na M-Pesa Online" (STK Push)
5. Get your Consumer Key, Consumer Secret, and Passkey
6. Use test credentials:
   - Shortcode: `174379`
   - Passkey: Available in the test credentials section

#### For Production:
1. Apply for M-Pesa API access through Safaricom
2. Complete the integration and testing
3. Get production credentials
4. Update environment variables

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### For Business Owners (Admin)

1. **Sign Up**: Create an account at `/signup`
2. **Login**: Access your dashboard at `/login`
3. **Create Plans**: Go to Plans & Packages to create WiFi plans
4. **Upload Vouchers**: Upload voucher codes for each plan
5. **Set Portal Slug**: Go to Settings and create your unique portal slug
6. **Share Portal**: Share your portal link with customers

### For Customers

1. Visit the portal link (e.g., `yourdomain.com/portal/your-slug`)
2. Select a plan (Daily, Weekly, or Monthly)
3. Enter M-Pesa phone number
4. Complete payment via STK Push
5. Receive voucher code instantly

## Project Structure

```
augument_code/
├── app/
│   ├── api/
│   │   └── mpesa/          # M-Pesa API routes
│   ├── dashboard/          # Admin dashboard pages
│   │   ├── plans/          # Plan management
│   │   ├── vouchers/       # Voucher management
│   │   ├── transactions/   # Transaction history
│   │   └── settings/       # Settings page
│   ├── portal/[slug]/      # Public customer portal
│   ├── login/              # Login page
│   └── signup/             # Signup page
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── mpesa.ts            # M-Pesa utilities
│   └── types.ts            # TypeScript types
├── supabase-schema.sql     # Database schema
└── package.json
```

## Database Schema

The system uses the following tables:

- **profiles**: User profiles and business information
- **plans**: WiFi plans (daily, weekly, monthly)
- **vouchers**: Voucher codes linked to plans
- **transactions**: Payment transactions and history

## M-Pesa Integration

The system uses M-Pesa STK Push for payments:

1. Customer initiates payment from portal
2. STK Push sent to customer's phone
3. Customer enters M-Pesa PIN
4. Callback received and processed
5. Voucher assigned and displayed to customer

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Important: M-Pesa Callback URL

For production, you need a public URL for M-Pesa callbacks:
- Update `MPESA_CALLBACK_URL` to your production URL
- Register the callback URL in Safaricom Developer Portal
- Ensure your server can receive POST requests

## Testing

### Test M-Pesa Payment (Sandbox)

Use these test credentials:
- Phone: `254708374149` (or any Safaricom number)
- Amount: Any amount
- PIN: `1234` (sandbox PIN)

## Troubleshooting

### M-Pesa Issues

- **"Invalid Access Token"**: Check your Consumer Key and Secret
- **"Invalid Shortcode"**: Verify your shortcode matches your credentials
- **"Callback not received"**: Ensure callback URL is publicly accessible

### Database Issues

- **"Row Level Security"**: Make sure RLS policies are set up correctly
- **"Permission denied"**: Check if user is authenticated

## Support

For issues and questions:
- Check the [Safaricom Developer Documentation](https://developer.safaricom.co.ke/Documentation)
- Review [Supabase Documentation](https://supabase.com/docs)

## License

MIT License - feel free to use this for your business!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

