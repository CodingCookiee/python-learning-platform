# Deployment Guide - Python Learning Platform

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Database**: Set up PostgreSQL (Vercel Postgres or Supabase)
4. **Redis**: Set up Upstash Redis for caching

## Environment Variables Setup

Before deploying, configure these environment variables in your Vercel project dashboard:

### Database

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Authentication (NextAuth.js)

```
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
```

### OAuth Providers (Optional for MVP)

```
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Redis (Upstash)

```
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### Analytics (Optional)

```
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id
```

## Deployment Steps

### 1. Connect GitHub Repository to Vercel

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

### 2. Set Up Vercel Postgres (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Create new **Postgres** database
4. Copy the `DATABASE_URL` connection string
5. Add it to your environment variables

### 3. Set Up Upstash Redis

1. Go to [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Select **REST API** tab
4. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
5. Add them to Vercel environment variables

### 4. Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Copy the output and set it as `NEXTAUTH_SECRET` in Vercel.

### 5. Run Database Migrations

After deploying, run migrations in Vercel:

```bash
# Using Vercel CLI
vercel env pull .env.local
npm run db:push
npm run db:seed
```

Or use Prisma Migrate in production:

```bash
npx prisma migrate deploy
```

### 6. Deploy to Vercel

#### Option A: Automatic Deployment (Recommended)

1. Push code to GitHub main branch
2. Vercel automatically deploys
3. Check deployment status in Vercel dashboard

#### Option B: Manual Deployment

```bash
# Deploy to production
vercel --prod

# Or deploy to preview
vercel
```

## Build Configuration

The build process is configured in `vercel.json`:

- Runs Prisma generate before Next.js build
- Optimized for serverless functions
- Caching headers configured for API routes
- Region: `iad1` (US East)

## Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Run database migrations
- [ ] Seed initial data (modules, lessons, achievements)
- [ ] Test authentication flow
- [ ] Verify Redis caching is working
- [ ] Check API routes are responding
- [ ] Test mobile responsiveness
- [ ] Enable Vercel Analytics (optional)
- [ ] Set up custom domain (optional)
- [ ] Configure OAuth providers (optional)

## Monitoring

### Vercel Dashboard

- Check deployment logs
- Monitor function execution times
- View bandwidth and request metrics
- Set up alerts for errors

### Database Monitoring

- Monitor connection pool usage
- Check query performance
- Set up automated backups

### Redis Monitoring

- Monitor cache hit rates
- Check memory usage
- Review command statistics

## Troubleshooting

### Build Failures

**Prisma generation fails:**

```bash
# Make sure DATABASE_URL is set in build environment
# Check vercel.json buildCommand includes "prisma generate"
```

**Type errors:**

```bash
# Run locally to check for TypeScript errors
npm run build
```

### Runtime Errors

**Database connection fails:**

- Verify DATABASE_URL is correct
- Check database is accepting connections
- Ensure database is not in sleep mode (if using free tier)

**Redis connection fails:**

- Verify Upstash credentials are correct
- Check Redis instance is active
- Review connection limits

**API routes timeout:**

- Optimize database queries
- Implement proper caching
- Check for infinite loops

## CI/CD Pipeline (Optional)

Add GitHub Actions workflow in `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test # If tests exist
```

## Performance Optimization

### Image Optimization

- Use Next.js Image component
- Compress images before uploading
- Use WebP format when possible

### Code Splitting

- Lazy load heavy components (Monaco Editor)
- Use dynamic imports for routes
- Optimize bundle size

### Caching Strategy

- Cache static content (1 hour)
- Cache user progress (5 minutes)
- Cache lessons/modules (1 hour)
- Invalidate on updates

## Scaling Considerations

### Database

- Monitor connection pool usage
- Consider read replicas for heavy traffic
- Implement connection pooling (PgBouncer)

### Serverless Functions

- Keep functions under 10 seconds execution time
- Use streaming for large responses
- Implement proper error handling

### Redis

- Monitor memory usage
- Implement cache eviction policies
- Use Redis clustering for high traffic

## Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Upstash Documentation](https://docs.upstash.com)
- [NextAuth.js Documentation](https://next-auth.js.org)
