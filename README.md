# Python Learning Platform 🐍

A modern, gamified learning platform for mastering Python from beginner to advanced levels. Built with Next.js 16, TypeScript, and deployed on Vercel.

## Features

- 🎯 **Structured Learning Path**: 16 modules from Python fundamentals to advanced topics
- 🎮 **Gamification**: XP system, achievements, daily streaks, and level progression
- 💪 **Interactive Exercises**: Code directly in the browser with instant feedback
- 🔥 **Streak Tracking**: Stay motivated with daily learning streaks
- 🌓 **Dark Mode**: Beautiful UI with light and dark themes
- 📱 **Mobile Responsive**: Learn on any device
- 🚀 **Fast & Modern**: Built with Next.js 16 and React 19

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL + Prisma ORM
- **Caching**: Upstash Redis
- **Authentication**: NextAuth.js v5
- **State Management**: Zustand
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Redis (Upstash recommended for production)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd python-learning-platform
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your database and authentication credentials.

4. Generate Prisma client:

```bash
npm run db:generate
```

5. Push database schema:

```bash
npm run db:push
```

6. Seed the database:

```bash
npm run db:seed
```

7. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
python-learning-platform/
├── app/               # Next.js app directory
│   ├── api/          # API routes
│   ├── auth/         # Authentication pages
│   └── ...           # Other pages
├── components/        # React components
│   └── ui/           # shadcn/ui components
├── lib/              # Utility functions and configurations
│   ├── store/        # Zustand stores
│   └── ...
├── prisma/           # Database schema and migrations
│   ├── seed-data/    # Seed data files
│   └── schema.prisma # Database schema
└── public/           # Static assets
```

## Database Schema

The platform uses 14 models:

- **Authentication**: User, Account, Session, VerificationToken
- **Content**: Module, Lesson, Exercise, Project
- **Progress Tracking**: Progress, ExerciseSubmission, ProjectSubmission
- **Gamification**: Achievement, UserAchievement, Streak

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to Vercel.

### Quick Deploy

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy!

## Environment Variables

Required environment variables:

```env
DATABASE_URL=                     # PostgreSQL connection string
NEXTAUTH_URL=                     # Application URL
NEXTAUTH_SECRET=                  # Generate with: openssl rand -base64 32
UPSTASH_REDIS_REST_URL=          # Upstash Redis URL
UPSTASH_REDIS_REST_TOKEN=        # Upstash Redis token
```

Optional (for OAuth):

```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Curriculum

The platform covers:

### Foundation Phase

1. Python Fundamentals
2. Data Structures
3. Functions and Modules

### Intermediate Phase

4. Object-Oriented Programming
5. File Handling and Exceptions
6. Modules and Packages
7. Working with APIs

### Advanced Phase

8. Advanced Python Concepts
9. Concurrency and Parallelism
10. Testing and Debugging
11. Web Development

### Applied Phase

12. Data Science Basics
13. Database Integration
14. Deployment and DevOps
15. Web Scraping and Automation
16. Capstone Project

## Features Roadmap

- [x] User authentication (email/password + OAuth)
- [x] Database schema and models
- [x] State management with Zustand
- [x] Dark mode support
- [ ] Module and lesson browser
- [ ] Interactive code exercises
- [ ] Progress tracking dashboard
- [ ] Achievement system
- [ ] Streak tracking
- [ ] Project submission system
- [ ] Admin dashboard
- [ ] Mobile app (future)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for learning and personal projects.

## Support

For questions or issues, please open an issue on GitHub.

---

Built with ❤️ using Next.js, TypeScript, and modern web technologies.
