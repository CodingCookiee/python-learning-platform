import { prisma } from "@/lib/prisma";

/**
 * The admin's view of AI use across the platform: calls and tokens by day,
 * feature, model and learner. Learners pay their providers directly (BYOK), so
 * this reports tokens rather than guessing dollars.
 */

export interface UsageTotals {
  calls: number;
  input: number;
  output: number;
  cached: number;
}

export interface AiUsageReport {
  days: number;
  totals: UsageTotals;
  today: UsageTotals;
  daily: Array<{ day: string; calls: number; tokens: number }>;
  byFeature: Array<UsageTotals & { feature: string }>;
  byModel: Array<UsageTotals & { provider: string; model: string }>;
  learners: Array<UsageTotals & { userId: string; name: string | null; email: string }>;
  keys: { total: number; byProvider: Array<{ provider: string; count: number }> };
}

type Sums = { _count: number; _sum: { inputTokens: number | null; outputTokens: number | null; cachedTokens: number | null } };

const totals = (a: Sums): UsageTotals => ({
  calls: a._count,
  input: a._sum.inputTokens ?? 0,
  output: a._sum.outputTokens ?? 0,
  cached: a._sum.cachedTokens ?? 0,
});

const SUM = { inputTokens: true, outputTokens: true, cachedTokens: true } as const;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function getAiUsageReport(days = 30): Promise<AiUsageReport> {
  const today = startOfDay(new Date());
  const since = new Date(today.getTime() - (days - 1) * 86_400_000);
  const where = { createdAt: { gte: since } };

  const [all, todays, rows, features, models, people, keyGroups] = await Promise.all([
    prisma.llmUsage.aggregate({ where, _count: true, _sum: SUM }),
    prisma.llmUsage.aggregate({ where: { createdAt: { gte: today } }, _count: true, _sum: SUM }),
    // Per-day buckets are made in JS, in the server's timezone, so they line up with "today"
    prisma.llmUsage.findMany({ where, select: { createdAt: true, inputTokens: true, outputTokens: true } }),
    prisma.llmUsage.groupBy({ by: ["feature"], where, _count: true, _sum: SUM }),
    prisma.llmUsage.groupBy({ by: ["provider", "model"], where, _count: true, _sum: SUM }),
    prisma.llmUsage.groupBy({ by: ["userId"], where, _count: true, _sum: SUM }),
    prisma.aiCredential.groupBy({ by: ["provider"], _count: true }),
  ]);

  const buckets = new Map<string, { calls: number; tokens: number }>();
  for (let i = 0; i < days; i++) buckets.set(dayKey(new Date(since.getTime() + i * 86_400_000)), { calls: 0, tokens: 0 });
  for (const r of rows) {
    const b = buckets.get(dayKey(r.createdAt));
    if (b) {
      b.calls++;
      b.tokens += r.inputTokens + r.outputTokens;
    }
  }

  const topPeople = people
    .map((p) => ({ userId: p.userId, ...totals(p) }))
    .sort((a, b) => b.input + b.output - (a.input + a.output))
    .slice(0, 10);
  const users = await prisma.user.findMany({
    where: { id: { in: topPeople.map((p) => p.userId) } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  const byTokens = <T extends UsageTotals>(a: T, b: T) => b.input + b.output - (a.input + a.output);

  return {
    days,
    totals: totals(all),
    today: totals(todays),
    daily: [...buckets.entries()].map(([day, v]) => ({ day, ...v })),
    byFeature: features.map((f) => ({ feature: f.feature, ...totals(f) })).sort(byTokens),
    byModel: models.map((m) => ({ provider: m.provider, model: m.model, ...totals(m) })).sort(byTokens),
    learners: topPeople.map((p) => ({ ...p, name: byId.get(p.userId)?.name ?? null, email: byId.get(p.userId)?.email ?? "(deleted)" })),
    keys: {
      total: keyGroups.reduce((n, k) => n + k._count, 0),
      byProvider: keyGroups.map((k) => ({ provider: k.provider, count: k._count })),
    },
  };
}
