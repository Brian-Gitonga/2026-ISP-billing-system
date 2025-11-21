# Deployment Guide

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Supabase project set up
- M-Pesa Daraja API credentials

## Option 1: Deploy to Vercel (Recommended)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/qtro-wifi.git
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New** > **Project**
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Step 3: Add Environment Variables

In Vercel project settings, add these environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://your-domain.vercel.app/api/mpesa/callback
MPESA_ENVIRONMENT=sandbox

NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### Step 4: Deploy

Click **Deploy** and wait for the build to complete.

### Step 5: Update M-Pesa Callback URL

1. Go to Safaricom Developer Portal
2. Update your app's callback URL to: `https://your-domain.vercel.app/api/mpesa/callback`
3. Make sure this URL is publicly accessible

## Option 2: Deploy to Other Platforms

### Netlify

1. Connect your GitHub repository
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Add environment variables
5. Deploy

### Railway

1. Create new project from GitHub
2. Add environment variables
3. Deploy

### DigitalOcean App Platform

1. Create new app from GitHub
2. Configure build settings
3. Add environment variables
4. Deploy

## Custom Domain Setup

### Vercel

1. Go to Project Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` and `MPESA_CALLBACK_URL` environment variables

## SSL Certificate

Vercel automatically provides SSL certificates. For other platforms, ensure SSL is enabled for M-Pesa callbacks.

## Production Checklist

- [ ] Database schema deployed to Supabase
- [ ] All environment variables configured
- [ ] M-Pesa callback URL registered with Safaricom
- [ ] SSL certificate active
- [ ] Custom domain configured (optional)
- [ ] Test payment flow end-to-end
- [ ] Monitor error logs
- [ ] Set up database backups in Supabase

## Monitoring

### Vercel Analytics

Enable Vercel Analytics in project settings for:
- Page views
- Performance metrics
- Error tracking

### Supabase Monitoring

Monitor in Supabase dashboard:
- Database usage
- API requests
- Error logs

### M-Pesa Transaction Logs

Check the Transactions page in your dashboard for:
- Payment success rate
- Failed transactions
- Revenue tracking

## Scaling Considerations

### Database

- Supabase free tier: 500MB database, 2GB bandwidth
- Upgrade to Pro for more resources
- Add database indexes for better performance

### API Rate Limits

- M-Pesa has rate limits (check Safaricom documentation)
- Implement request queuing if needed

### Caching

Consider adding caching for:
- Public portal pages
- Plan listings
- Static assets

## Security Best Practices

1. **Never commit `.env.local`** - It's in .gitignore
2. **Use service role key only on server** - Never expose to client
3. **Enable RLS policies** - Already configured in schema
4. **Validate M-Pesa callbacks** - Verify source IP if possible
5. **Monitor for suspicious activity** - Check transaction logs regularly

## Backup Strategy

### Database Backups

Supabase Pro includes:
- Daily automated backups
- Point-in-time recovery
- Manual backup option

### Code Backups

- GitHub repository (version control)
- Vercel deployment history

## Troubleshooting Production Issues

### M-Pesa Callback Not Received

1. Check callback URL is correct
2. Verify SSL certificate is valid
3. Check server logs in Vercel
4. Test callback URL with curl:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/mpesa/callback \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

### Database Connection Issues

1. Check Supabase project status
2. Verify environment variables
3. Check RLS policies
4. Review Supabase logs

### Build Failures

1. Check build logs in Vercel
2. Verify all dependencies are in package.json
3. Test build locally: `npm run build`
4. Check Node.js version compatibility

## Performance Optimization

### Image Optimization

Use Next.js Image component for logos and images:
```tsx
import Image from 'next/image'
```

### Code Splitting

Next.js automatically code-splits. Ensure dynamic imports for heavy components.

### Database Queries

- Use indexes (already in schema)
- Limit query results
- Cache frequently accessed data

## Cost Estimation

### Free Tier (Development/Small Scale)

- Vercel: Free (Hobby plan)
- Supabase: Free (500MB database)
- M-Pesa: Pay per transaction

### Production (Medium Scale)

- Vercel Pro: $20/month
- Supabase Pro: $25/month
- M-Pesa: Transaction fees apply
- Custom domain: ~$12/year

## Support and Maintenance

### Regular Tasks

- Monitor transaction success rate
- Check for failed payments
- Review error logs weekly
- Update dependencies monthly
- Backup database regularly

### Updates

```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## Going Live Checklist

- [ ] Test all features thoroughly
- [ ] Switch M-Pesa to production mode
- [ ] Update environment variables
- [ ] Test payment with real money (small amount)
- [ ] Set up monitoring and alerts
- [ ] Prepare customer support process
- [ ] Create user documentation
- [ ] Announce launch to customers

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [M-Pesa API Documentation](https://developer.safaricom.co.ke/Documentation)

