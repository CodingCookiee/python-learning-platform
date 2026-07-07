import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  BookOpen,
  Code2,
  Zap,
  Trophy,
  Users,
  ArrowRight,
  CheckCircle2,
  Star,
  GitBranch,
  Database,
  Globe,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: GitBranch,
    title: "JavaScript Bridge",
    description:
      "Side-by-side comparisons of JavaScript and Python concepts so you can leverage everything you already know.",
  },
  {
    icon: Code2,
    title: "Interactive Exercises",
    description:
      "Write and run real Python code directly in your browser with instant feedback and automated test cases.",
  },
  {
    icon: Trophy,
    title: "Gamified Progress",
    description:
      "Earn XP, unlock badges, and keep streaks alive. Learning Python should feel like leveling up.",
  },
  {
    icon: Database,
    title: "Full-Stack Python",
    description:
      "FastAPI, SQLAlchemy, async patterns — everything you need to build production-grade Python backends.",
  },
  {
    icon: Globe,
    title: "Modern Tooling",
    description:
      "Poetry, mypy, Pydantic, pytest — the same quality-first mindset you bring to your TypeScript projects.",
  },
  {
    icon: Zap,
    title: "Accelerated Pace",
    description:
      "Skip the beginner fluff. The curriculum is designed for developers who already understand programming.",
  },
];

const testimonials = [
  {
    name: "Alex Chen",
    role: "Full-Stack Engineer",
    avatar: "AC",
    content:
      "The JavaScript Bridge sections saved me weeks. I stopped fighting Python and started enjoying it within days.",
    stars: 5,
  },
  {
    name: "Maria Santos",
    role: "React Developer",
    avatar: "MS",
    content:
      "Coming from TypeScript, the type hints module was exactly what I needed. Pydantic just clicks after Zod.",
    stars: 5,
  },
  {
    name: "Jordan Kim",
    role: "Node.js Engineer",
    avatar: "JK",
    content:
      "The async module is phenomenal. asyncio finally made sense when compared to Promises side by side.",
    stars: 5,
  },
];

const curriculumPhases = [
  { phase: "Phase 1", label: "Foundations", modules: "Modules 1-3", weeks: "Week 1" },
  { phase: "Phase 2", label: "Intermediate", modules: "Modules 4-7", weeks: "Week 2" },
  { phase: "Phase 3", label: "Advanced Python", modules: "Modules 8-10", weeks: "Week 3" },
  { phase: "Phase 4", label: "Applied Python", modules: "Modules 11-16", weeks: "Week 4" },
];

const topicTags = [
  "Data Structures",
  "OOP",
  "asyncio",
  "FastAPI",
  "SQLAlchemy",
  "pytest",
  "Type Hints",
  "Pydantic",
  "NumPy & Pandas",
  "Docker",
  "Poetry",
  "Decorators",
  "Generators",
  "Metaclasses",
  "Web3.py",
  "Performance Tuning",
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const [moduleCount, lessonCount, projectCount, exerciseCount] = await Promise.all([
    prisma.module.count(),
    prisma.lesson.count(),
    prisma.project.count(),
    prisma.exercise.count(),
  ]);

  const stats = [
    { value: String(moduleCount), label: "Modules live" },
    { value: String(lessonCount), label: "Lessons live" },
    { value: String(projectCount), label: "Projects live" },
    { value: String(exerciseCount), label: "Exercises live" },
  ];

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Terminal className="size-5 text-primary" aria-hidden="true" />
            <span className="font-heading text-sm font-semibold tracking-widest uppercase">
              PyLearn
            </span>
          </div>
          <nav
            className="hidden items-center gap-6 text-xs font-semibold tracking-widest uppercase text-muted-foreground md:flex"
            aria-label="Main navigation"
          >
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#curriculum" className="transition-colors hover:text-foreground">
              Curriculum
            </a>
            <a href="#testimonials" className="transition-colors hover:text-foreground">
              Reviews
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth/signup">
                Get Started
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section
          className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40"
          aria-labelledby="hero-heading"
        >
          {/* Animated gradient background */}
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="landing-hero-gradient absolute inset-0" />
            <div className="landing-blob landing-blob-1 absolute -top-32 -left-32 size-[600px] rounded-full blur-3xl" />
            <div className="landing-blob landing-blob-2 absolute -bottom-32 -right-32 size-[500px] rounded-full blur-3xl" />
            <div className="landing-blob landing-blob-3 absolute top-1/2 left-1/2 size-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="size-3 text-yellow-500" aria-hidden="true" />
              Built for JS developers &middot; No fluff, pure signal
            </Badge>

            <h1
              id="hero-heading"
              className="font-heading text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            >
              Python mastery for <span className="landing-gradient-text">JavaScript devs</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Stop Googling &ldquo;Python equivalent of&hellip;&rdquo;. This curriculum bridges your
              existing JavaScript and TypeScript knowledge directly to Python &mdash; with
              side-by-side code comparisons, real projects, and zero repetition of things you
              already know.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/auth/signup">
                  Start Learning Free
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#curriculum">Browse Curriculum</a>
              </Button>
            </div>

            {/* <p className="mt-10 text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              Trusted by engineers at
            </p>
            <div
              className="mt-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-2"
              aria-label="Companies"
            >
              {["Stripe", "Vercel", "Linear", "Supabase", "Fly.io"].map((co) => (
                <span
                  key={co}
                  className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/50"
                >
                  {co}
                </span>
              ))}
            </div> */}
          </div>
        </section>

        {/* Stats */}
        <section aria-label="Program statistics">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-4">
              {stats.map(({ value, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center gap-1 bg-background px-6 py-10"
                >
                  <span className="font-heading text-3xl font-semibold sm:text-4xl">{value}</span>
                  <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <Badge className="mb-4 text-muted-foreground">
                <BookOpen className="size-3" aria-hidden="true" />
                How it works
              </Badge>
              <h2
                id="features-heading"
                className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                Everything you need to go deep
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                Designed around how experienced developers actually learn &mdash; fast ramp, deep
                coverage, and immediate practical application.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="group transition-shadow duration-300 hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 pt-8">
                    <div className="flex size-10 shrink-0 items-center justify-center bg-muted ring-1 ring-border transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-semibold tracking-widest uppercase">
                        {title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Curriculum */}
        <section
          id="curriculum"
          className="border-y border-border bg-muted/30 px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
          aria-labelledby="curriculum-heading"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <Badge className="mb-4 text-muted-foreground">
                <Terminal className="size-3" aria-hidden="true" />
                The curriculum
              </Badge>
              <h2
                id="curriculum-heading"
                className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                Current release and roadmap
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                All phases are live. The full roadmap is designed as a focused 3-4 week sprint, so
                learners can see what comes next without being sold a marathon.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {curriculumPhases.map(({ phase, label, modules, weeks }, i) => (
                <div
                  key={phase}
                  className="relative overflow-hidden border border-border bg-background p-6"
                >
                  <span
                    className="pointer-events-none absolute -top-4 -right-2 font-heading text-8xl font-semibold text-border/60 select-none"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <Badge className="mb-4 text-xs text-muted-foreground">{phase}</Badge>
                  <h3 className="font-heading text-sm font-semibold tracking-widest uppercase">
                    {label}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground">{modules}</p>
                  <p className="text-xs text-muted-foreground">{weeks}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 border border-border bg-background p-8">
              <h3 className="mb-6 font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Topics covered
              </h3>
              <ul className="flex flex-wrap gap-3" aria-label="Curriculum topics">
                {topicTags.map((topic) => (
                  <li
                    key={topic}
                    className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-semibold tracking-widest uppercase text-muted-foreground"
                  >
                    <CheckCircle2 className="size-3 shrink-0 text-primary" aria-hidden="true" />
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section
          id="testimonials"
          className="px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
          aria-labelledby="testimonials-heading"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <Badge className="mb-4 text-muted-foreground">
                <Users className="size-3" aria-hidden="true" />
                What developers say
              </Badge>
              <h2
                id="testimonials-heading"
                className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                Built for devs, loved by devs
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map(({ name, role, avatar, content, stars }) => (
                <Card key={name}>
                  <CardContent className="flex flex-col gap-4 pt-8">
                    <div
                      className="flex gap-0.5"
                      aria-label={`Rated ${stars} out of 5 stars`}
                      role="img"
                    >
                      {Array.from({ length: stars }).map((_, i) => (
                        <Star
                          key={i}
                          className="size-3.5 fill-yellow-400 text-yellow-400"
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      &ldquo;{content}&rdquo;
                    </p>
                    <div className="mt-auto flex items-center gap-3 border-t border-border pt-4">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center bg-primary text-[0.625rem] font-semibold tracking-widest text-primary-foreground"
                        aria-hidden="true"
                      >
                        {avatar}
                      </div>
                      <div>
                        <p className="text-xs font-semibold tracking-widest uppercase">{name}</p>
                        <p className="text-xs text-muted-foreground">{role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section
          className="relative overflow-hidden border-t border-border bg-primary px-4 py-24 text-primary-foreground sm:px-6 sm:py-32 lg:px-8"
          aria-labelledby="cta-heading"
        >
          <div className="pointer-events-none absolute inset-0 opacity-10" aria-hidden="true">
            <div className="landing-cta-grid absolute inset-0" />
          </div>
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="cta-heading"
              className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Ready to add Python to your stack?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed opacity-80">
              Join developers who made the leap from JavaScript to Python without starting from
              scratch.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Link href="/auth/signup">
                  Start for Free
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                asChild
                className="border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              PyLearn
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} PyLearn. Built for JavaScript developers.
          </p>
          <nav className="flex gap-4" aria-label="Footer navigation">
            <Link
              href="/auth/signin"
              className="text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign Up
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
