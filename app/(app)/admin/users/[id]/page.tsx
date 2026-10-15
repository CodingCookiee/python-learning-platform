import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { AdminAction } from "@/components/admin/admin-action";
import { StatusChip } from "@/components/admin/status-chip";
import { requireAdminPage } from "@/lib/admin/guard";
import { ACTION_LABEL, getUserRecord, type UserRecord } from "@/lib/admin/users";
import { ROLE_LABEL } from "@/lib/admin/levels";
import { isEmailConfigured } from "@/lib/email";
import { CERTIFICATE } from "@/lib/certificate-rules";
import { BELTS } from "@/lib/ranks";

export const metadata: Metadata = { title: "User record (admin)" };

const EXPERIENCE: Record<string, string> = {
  new: "New to programming",
  "other-language": "Codes in another language",
  python: "Already knows some Python",
};
const GOAL: Record<string, string> = {
  python: "Python to black belt",
  automation: "Python, then AI automation",
};
const STATUS: Record<string, { label: string; tone: "admin" | "warn" | "muted" }> = {
  pending: { label: "Waiting for review", tone: "muted" },
  approved: { label: "Approved", tone: "admin" },
  rejected: { label: "Sent back", tone: "warn" },
};

/** The role changes a super admin can make, in words */
const ROLE_MOVES: Array<{
  to: "LEARNER" | "ADMIN" | "SUPER_ADMIN";
  title: string;
  description: string;
  label: (from: string) => string;
}> = [
  {
    to: "ADMIN",
    title: "an admin",
    description:
      "An admin reviews capstone submissions and sees the overview, read-only. They can't open accounts, change progress or certificates, or see the audit log.",
    label: (from) => (from === "SUPER_ADMIN" ? "Make regular admin" : "Make admin"),
  },
  {
    to: "SUPER_ADMIN",
    title: "a super admin",
    description:
      "A super admin has everything you have: every account and every action here, content, AI usage and the audit log. Only give this to someone you trust completely.",
    label: () => "Make super admin",
  },
  {
    to: "LEARNER",
    title: "a learner again",
    description: "They keep their account and progress, and lose the admin area.",
    label: () => "Remove admin role",
  },
];

function day(d: Date | null | undefined): string {
  return d
    ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";
}
function when(d: Date): string {
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Section({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={id} className="text-xl font-semibold">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 border-b border-border py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function ModuleRow({
  userId,
  m,
  gradable,
}: {
  userId: string;
  m: UserRecord["tracks"][number]["modules"][number];
  gradable: boolean;
}) {
  const status = m.passed
    ? m.granted
      ? { label: "Passed · granted", tone: "admin" as const }
      : m.placement
        ? { label: "Passed · tested out", tone: "admin" as const }
        : { label: "Passed", tone: "admin" as const }
    : m.unlocked
      ? { label: "Open", tone: "muted" as const }
      : { label: "Locked", tone: "muted" as const };
  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-b border-border py-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto]">
      <span className="font-condensed tabular pt-0.5 text-sm text-muted-foreground">
        {String(m.order).padStart(2, "0")}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{m.title}</span>
          <StatusChip tone={status.tone}>{status.label}</StatusChip>
          {m.cooling && <StatusChip tone="warn">Waiting to retry</StatusChip>}
        </span>
        <span className="font-condensed tabular text-xs text-muted-foreground">
          {m.lessonsDone} / {m.lessonsTotal} lessons
        </span>
      </span>
      {/* Pinned to the row's right edge, whatever the title's length */}
      {gradable && m.gradable && (
        <span className="col-start-2 flex flex-wrap gap-2 sm:col-start-3 sm:justify-self-end">
          {m.cooling && (
            <AdminAction
              key="clear"
              userId={userId}
              spec={{ action: "clear-cooldown", moduleId: m.id }}
              label="Let them retry now"
              busyLabel="Clearing…"
              size="xs"
            />
          )}
          {m.passed ? (
            // Keyed by what it does, so a finished grant's message doesn't carry over to the Revoke after it
            <AdminAction
              key="revoke"
              userId={userId}
              spec={{ action: "revoke-module", moduleId: m.id }}
              label="Revoke pass"
              busyLabel="Revoking…"
              size="xs"
              variant="ghost"
              confirm={{
                title: `Revoke the pass for ${m.title}?`,
                description: (
                  <p>
                    The module goes back to not passed, and every module after it locks again until
                    it&apos;s passed. Their lessons, drills and XP stay. It&apos;s logged under your
                    name.
                  </p>
                ),
                confirmLabel: "Revoke pass",
                destructive: true,
              }}
            />
          ) : (
            <AdminAction
              key="grant"
              userId={userId}
              spec={{ action: "grant-module", moduleId: m.id }}
              label="Grant pass"
              busyLabel="Granting…"
              size="xs"
              confirm={{
                title: `Pass ${m.title} for them?`,
                description: (
                  <p>
                    It counts as passed without a grading (marked &ldquo;granted&rdquo;), and the
                    next module opens. No grading XP is given. It&apos;s logged under your name.
                  </p>
                ),
                confirmLabel: "Grant pass",
              }}
            />
          )}
        </span>
      )}
    </li>
  );
}

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdminPage();
  const { id } = await params;
  const record = await getUserRecord(id);
  if (!record) notFound();
  const { user, rank, tracks, attempts, drills, submissions, certificates, counts, history } =
    record;
  const self = user.id === me.id;
  const name = user.name || "Unnamed learner";
  const signIn = [
    user.hasPassword && "Email and password",
    ...user.providers.map((p) => (p === "github" ? "GitHub" : p === "google" ? "Google" : p)),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-10">
        <FadeIn>
          <Breadcrumb
            items={[
              { label: "Admin", href: "/admin" },
              { label: "Users", href: "/admin/users" },
              { label: name },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.03}>
          <header className="flex flex-col gap-3 border-b border-border pb-8">
            <div className="flex flex-wrap items-center gap-2">
              {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                <StatusChip tone="admin">{ROLE_LABEL[user.role]}</StatusChip>
              )}
              {user.suspendedAt && (
                <StatusChip tone="warn">Suspended {day(user.suspendedAt)}</StatusChip>
              )}
              {!user.emailVerified && <StatusChip tone="muted">Email not confirmed</StatusChip>}
              {self && <StatusChip tone="muted">You</StatusChip>}
            </div>
            <h1 className="font-condensed text-5xl leading-[0.95] font-extrabold tracking-[-0.02em] break-words">
              {name}
            </h1>
            <p className="text-lg text-muted-foreground">
              {user.email} · {rank.label}, {rank.beltLabel} · Level {user.level},{" "}
              {user.xp.toLocaleString()} XP
            </p>
            {user.suspendedAt && user.suspendedReason && (
              <p className="max-w-2xl border-l-2 border-destructive pl-3 text-sm">
                Suspended because: {user.suspendedReason}
              </p>
            )}
          </header>
        </FadeIn>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-12">
            <FadeIn delay={0.05}>
              <Section id="progress-heading" title="Progress">
                <div className="flex flex-col gap-8">
                  {tracks.map((t) => (
                    <div key={t.slug} className="flex flex-col gap-2">
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        {t.title} · {t.modules.filter((m) => m.passed).length} of {t.modules.length}{" "}
                        passed
                      </h3>
                      <ol className="flex flex-col border-t border-border">
                        {t.modules.map((m) => (
                          <ModuleRow
                            key={m.id}
                            userId={user.id}
                            m={m}
                            gradable={t.slug !== "start"}
                          />
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </Section>
            </FadeIn>

            <FadeIn delay={0.06}>
              <Section
                id="gradings-heading"
                title="Gradings"
                aside={<span className="text-sm text-muted-foreground">Latest 30</span>}
              >
                {attempts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No gradings yet.</p>
                ) : (
                  <ol className="flex flex-col border-t border-border">
                    {attempts.map((a) => {
                      const belt = a.belt ? BELTS.find((b) => b.key === a.belt)?.label : null;
                      return (
                        <li
                          key={a.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border py-2.5 text-sm"
                        >
                          <span className="min-w-0">
                            <span className="font-medium">
                              {belt ? `${belt} test-out` : a.module.title}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              ·{" "}
                              {a.grantedById
                                ? "granted by an admin"
                                : a.placement
                                  ? "to test out"
                                  : "module grading"}{" "}
                              · {when(a.startedAt)}
                            </span>
                          </span>
                          <span className="font-condensed tabular flex items-center gap-2">
                            {!a.submittedAt ? (
                              <StatusChip tone="muted">In progress</StatusChip>
                            ) : (
                              <>
                                {!a.grantedById && <span>{Math.round((a.score ?? 0) * 100)}%</span>}
                                <StatusChip tone={a.passed ? "admin" : "warn"}>
                                  {a.passed ? "Passed" : "Not passed"}
                                </StatusChip>
                              </>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </Section>
            </FadeIn>

            <FadeIn delay={0.07}>
              <Section id="capstones-heading" title="Capstones">
                {submissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No capstones handed in.</p>
                ) : (
                  <ol className="flex flex-col border-t border-border">
                    {submissions.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/admin/projects/${s.id}/evaluate`}
                          className="-mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-sm border-b border-border px-3 py-2.5 text-sm hover:bg-accent/40"
                        >
                          <span className="min-w-0">
                            <span className="font-medium">{s.project.title}</span>
                            <span className="text-muted-foreground">
                              {" "}
                              · module {s.project.module.order} · handed in {day(s.submittedAt)}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <StatusChip tone={STATUS[s.status]?.tone ?? "muted"}>
                              {STATUS[s.status]?.label ?? s.status}
                            </StatusChip>
                            <ArrowRight
                              className="size-4 text-muted-foreground"
                              aria-hidden="true"
                            />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>
            </FadeIn>

            <FadeIn delay={0.08}>
              <Section id="certificates-heading" title="Certificates">
                {certificates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None claimed.</p>
                ) : (
                  <ul className="flex flex-col border-t border-border">
                    {certificates.map((c) => (
                      <li
                        key={c.code}
                        className="flex flex-col gap-2 border-b border-border py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="flex min-w-0 flex-col gap-0.5 text-sm">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              {CERTIFICATE[c.track as keyof typeof CERTIFICATE]?.title ?? c.track}
                            </span>
                            {c.revokedAt ? (
                              <StatusChip tone="warn">Revoked {day(c.revokedAt)}</StatusChip>
                            ) : c.withdrawnAt ? (
                              <StatusChip tone="muted">Page withdrawn by holder</StatusChip>
                            ) : (
                              <StatusChip tone="admin">Live</StatusChip>
                            )}
                          </span>
                          <span className="text-muted-foreground">
                            <span className="font-mono">{c.code}</span> · {c.name} · issued{" "}
                            {day(c.issuedAt)}
                            {c.revokedReason && ` · ${c.revokedReason}`}
                          </span>
                          {!c.revokedAt && (
                            <Link
                              href={`/certificates/${c.code}`}
                              className="w-fit text-primary underline"
                            >
                              Open its page
                            </Link>
                          )}
                        </span>
                        {c.revokedAt ? (
                          <AdminAction
                            userId={user.id}
                            spec={{ action: "reinstate-certificate", code: c.code }}
                            label="Reinstate"
                            busyLabel="Reinstating…"
                            confirm={{
                              title: "Reinstate this certificate?",
                              description: (
                                <p>
                                  Its page and image come back (unless the holder withdrew the page
                                  themselves).
                                </p>
                              ),
                              confirmLabel: "Reinstate",
                            }}
                          />
                        ) : (
                          <AdminAction
                            userId={user.id}
                            spec={{ action: "revoke-certificate", code: c.code }}
                            label="Revoke"
                            busyLabel="Revoking…"
                            variant="ghost"
                            confirm={{
                              title: "Revoke this certificate?",
                              description: (
                                <p>
                                  It becomes void: its page and image stop existing for everyone,
                                  and the holder can&apos;t restore it. You can reinstate it later.
                                </p>
                              ),
                              confirmLabel: "Revoke certificate",
                              destructive: true,
                              field: {
                                name: "reason",
                                label: "Reason (kept in the log)",
                                placeholder: "e.g. capstone was copied",
                              },
                            }}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </FadeIn>

            <FadeIn delay={0.09}>
              <Section
                id="history-heading"
                title="Admin history"
                aside={
                  <Link
                    href={`/admin/activity?user=${user.id}`}
                    className="text-sm font-medium text-primary underline"
                  >
                    All of it
                  </Link>
                }
              >
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No admin has changed this account.
                  </p>
                ) : (
                  <ol className="flex flex-col border-t border-border">
                    {history.map((h) => (
                      <li
                        key={h.id}
                        className="flex flex-col gap-0.5 border-b border-border py-2.5 text-sm sm:flex-row sm:justify-between sm:gap-4"
                      >
                        <span>
                          <span className="font-medium">{ACTION_LABEL[h.action] ?? h.action}</span>
                          {h.detail && typeof h.detail === "object" && "module" in h.detail && (
                            <span className="text-muted-foreground">
                              {" "}
                              · {String((h.detail as { module: unknown }).module)}
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          {h.adminEmail} · {when(h.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>
            </FadeIn>
          </div>

          <aside className="flex flex-col gap-12 lg:sticky lg:top-24 lg:self-start">
            <FadeIn delay={0.05}>
              <Section id="account-heading" title="Account">
                <dl className="border-t border-border">
                  <Fact label="Joined">{day(user.createdAt)}</Fact>
                  <Fact label="Email">
                    {user.emailVerified ? `Confirmed ${day(user.emailVerified)}` : "Not confirmed"}
                  </Fact>
                  <Fact label="Signs in with">{signIn || "—"}</Fact>
                  <Fact label="Last seen">{day(user.lastSeenAt)}</Fact>
                  <Fact label="Last trained">
                    {user.streak && user.streak.longestStreak > 0 ? day(user.streak.lastActivityDate) : "Hasn't trained yet"}
                  </Fact>
                  <Fact label="Streak">
                    {user.streak?.currentStreak ?? 0} days (best {user.streak?.longestStreak ?? 0})
                  </Fact>
                  <Fact label="Starting point">
                    {user.experience
                      ? (EXPERIENCE[user.experience] ?? user.experience)
                      : "Not onboarded yet"}
                  </Fact>
                  <Fact label="Goal">
                    {user.goal
                      ? `${GOAL[user.goal] ?? user.goal}, ${user.weeklyHours} h a week`
                      : "—"}
                  </Fact>
                  <Fact label="Drills">
                    {drills.passedRuns} passing runs, {drills.failedRuns} failing
                  </Fact>
                  <Fact label="Also">
                    {counts.achievements} achievements · {counts.logEntries} log check-ins ·{" "}
                    {counts.aiCalls} AI calls
                  </Fact>
                  <Fact label="AI key">
                    {user.aiCredential
                      ? `${user.aiCredential.provider}, ${user.aiCredential.model}`
                      : "None"}
                  </Fact>
                </dl>
              </Section>
            </FadeIn>

            <FadeIn delay={0.06}>
              <Section id="actions-heading" title="Account actions">
                {self ? (
                  <p className="text-sm text-muted-foreground">
                    This is your account. Change your own name and password in Settings; another
                    admin can change your role.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                      {user.suspendedAt ? (
                        <AdminAction
                          userId={user.id}
                          spec={{ action: "unsuspend" }}
                          label="Lift suspension"
                          busyLabel="Lifting…"
                          confirm={{
                            title: `Lift ${name}'s suspension?`,
                            description: <p>They can sign in and use pylearn again.</p>,
                            confirmLabel: "Lift suspension",
                          }}
                        />
                      ) : (
                        <AdminAction
                          userId={user.id}
                          spec={{ action: "suspend" }}
                          label="Suspend"
                          busyLabel="Suspending…"
                          confirm={{
                            title: `Suspend ${name}?`,
                            description: (
                              <p>
                                They&apos;re signed out of everything and can&apos;t sign in until
                                you lift it. Nothing in the account is deleted.
                              </p>
                            ),
                            confirmLabel: "Suspend account",
                            destructive: true,
                            field: {
                              name: "reason",
                              label: "Reason (shown here, not to them)",
                              placeholder: "e.g. spam sign-ups",
                            },
                          }}
                        />
                      )}
                      {/* Role: every move to another level, each confirmed */}
                      {ROLE_MOVES.filter((r) => r.to !== user.role).map((r) => (
                        <AdminAction
                          key={r.to}
                          userId={user.id}
                          spec={{ action: "role", role: r.to }}
                          label={r.label(user.role)}
                          busyLabel="Changing…"
                          variant={r.to === "LEARNER" ? "ghost" : "outline"}
                          confirm={{
                            title: `Make ${name} ${r.title}?`,
                            description: <p>{r.description}</p>,
                            confirmLabel: r.label(user.role),
                            destructive: r.to === "LEARNER",
                          }}
                        />
                      ))}
                      {!user.emailVerified && (
                        <AdminAction
                          userId={user.id}
                          spec={{ action: "verify" }}
                          label="Mark email confirmed"
                          busyLabel="Confirming…"
                        />
                      )}
                      {user.hasPassword && (
                        <AdminAction
                          userId={user.id}
                          spec={{ action: "reset-link" }}
                          label="Send password-reset link"
                          busyLabel="Sending…"
                          variant="ghost"
                        />
                      )}
                    </div>
                    {user.hasPassword && !isEmailConfigured() && (
                      <p className="text-xs text-muted-foreground">
                        Reset links need email set up on the server.
                      </p>
                    )}
                    <div className="flex flex-col gap-2 border-t border-border pt-4">
                      <AdminAction
                        userId={user.id}
                        spec={{ action: "delete" }}
                        label="Delete account"
                        busyLabel="Deleting…"
                        variant="destructive"
                        redirectTo="/admin/users"
                        confirm={{
                          title: `Delete ${name}'s account?`,
                          description: (
                            <p>
                              Everything goes: progress, gradings, capstones, certificates, log. It
                              can&apos;t be undone. To confirm, type their email address.
                            </p>
                          ),
                          confirmLabel: "Delete for good",
                          destructive: true,
                          field: {
                            name: "confirmEmail",
                            label: "Their email address",
                            placeholder: user.email,
                            required: true,
                            mustEqual: user.email,
                          },
                          checkbox: {
                            name: "block",
                            label: "Don't let this address sign up again",
                            hint: "Only a fingerprint of the address is kept. You can lift the block from Users.",
                            defaultChecked: true,
                          },
                        }}
                      />
                    </div>
                  </div>
                )}
              </Section>
            </FadeIn>
          </aside>
        </div>
      </StaggerContainer>
    </div>
  );
}
