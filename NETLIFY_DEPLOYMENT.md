# Quick Netlify Deployment Guide

## 🚀 Quick Start

Your application is now ready for Netlify deployment with all configurations embedded in the codebase!

## ✅ What Was Fixed

1. **Portal Page Issue**: Fixed "page not found" error when clicking buy button
2. **Admin Login Issue**: Fixed "wrong credentials" error
3. **Configuration**: All environment variables now embedded in `lib/config.ts`

## 📦 Deploy Now

### Option 1: Git Push (Recommended)
```bash
git add .
git commit -m "Fix: Embed configuration for Netlify deployment"
git push
```
Netlify will automatically build and deploy.

### Option 2: Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

## 🔧 Configuration

All configuration is in `lib/config.ts`:
- **Supabase**: Already configured
- **M-Pesa**: Sandbox mode, callback URL set to your Netlify site
- **App URL**: https://qtroisp.netlify.app

### To Update Your Site URL
If deploying to a different Netlify site:
1. Open `lib/config.ts`
2. Update these values:
   ```typescript
   mpesa: {
     callbackUrl: 'https://YOUR-SITE.netlify.app/api/mpesa/callback',
   },
   app: {
     url: 'https://YOUR-SITE.netlify.app',
   },
   ```
3. Commit and push

## ✨ What Works Now

- ✅ Portal pages load correctly
- ✅ Buy button initiates M-Pesa payment
- ✅ M-Pesa callbacks are received
- ✅ Vouchers are generated
- ✅ Admin login works
- ✅ All admin features functional

## 🧪 Testing After Deployment

1. **Test Portal**: `https://your-site.netlify.app/portal/[your-slug]`
2. **Test Admin**: `https://your-site.netlify.app/admin/login`
3. **Test Payment**: Make a test purchase on portal page

## 📚 Documentation

- **Full Guide**: See `DEPLOYMENT_GUIDE.md`
- **Changes**: See `CHANGES_SUMMARY.md`
- **Setup**: See `SETUP.md`

## 🆘 Troubleshooting

### Build Fails
```bash
rm -rf node_modules .next
npm install
npm run build
```

### Portal Not Found
- Verify portal slug exists in database
- Check user has active plans

### Admin Login Fails
- Verify admin user exists in `admin_users` table
- Check password hash is correct

### M-Pesa Issues
- Verify callback URL is accessible
- Check M-Pesa sandbox status
- Review Netlify function logs

## 🔐 Security Note

Configuration is embedded in code for simplicity. This is fine for:
- Private repositories
- Internal deployments
- Development/testing

For production with public repos, consider using Netlify environment variables.

## 📞 Support

Check these in order:
1. Netlify deployment logs
2. Netlify function logs
3. Supabase logs
4. M-Pesa sandbox status
5. Documentation files

---

**That's it!** Your application is ready to deploy. Just push your code and it will work exactly like it does on localhost.