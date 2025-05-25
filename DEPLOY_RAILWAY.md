# Railway Deployment Guide

## Quick Deploy to Railway

Your code is now published to GitHub: https://github.com/patrg444/Document-proc-convert

### Step 1: Deploy from GitHub

1. Go to [Railway](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `patrg444/Document-proc-convert`
5. Railway will automatically detect the Dockerfile and start deployment

### Step 2: Add Redis Service (Optional but Recommended)

1. In your Railway project, click "+ New"
2. Select "Database" → "Redis"
3. Railway will automatically inject the `REDIS_URL` environment variable

### Step 3: Configure Environment Variables

Click on your service in Railway and go to "Variables" tab. Add:

```
NODE_ENV=production
RAPIDAPI_PROXY_SECRET=your-secret-here
```

### Step 4: Get Your API URL

Once deployed, Railway will provide you with a URL like:
`https://document-proc-convert-production.up.railway.app`

### Step 5: Verify Deployment

Test your deployment:
```bash
curl https://your-app.railway.app/health
```

### Step 6: Configure on RapidAPI

1. Go to [RapidAPI Provider Dashboard](https://rapidapi.com/provider)
2. Add new API
3. Set base URL to your Railway URL
4. Configure endpoints as documented in README.md
5. Set your pricing tiers

## Monitoring

- Check logs in Railway dashboard
- Monitor Redis usage if using async jobs
- Set up alerts for errors

## Updates

To deploy updates:
1. Push changes to GitHub
2. Railway will automatically redeploy

That's it! Your API should be live on Railway within minutes.
