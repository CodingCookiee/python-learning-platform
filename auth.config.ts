import type { NextAuthConfig } from "next-auth";
import { notifySignup } from "@/lib/admin/notifications";
import { isEmailBlocked } from "@/lib/admin/blocked-emails";
import { normalizeEmail } from "@/lib/email-address";
import { promotesToAdmin } from "@/lib/admin/bootstrap";
import type { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** Shown to the learner as a code; neither reveals whether an account exists without the password */
class UnverifiedEmail extends CredentialsSignin {
  code = "unverified";
}
class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}
class SuspendedAccount extends CredentialsSignin {
  code = "suspended";
}

/** Whether GitHub lists this address as verified on the account that's signing in */
async function githubEmailVerified(accessToken: string | undefined, email: string | null | undefined) {
  if (!accessToken || !email) return false;
  try {
    const res = await fetch("https://api.github.com/user/emails", {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/vnd.github+json", "user-agent": "pylearn" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return false;
    const emails = (await res.json()) as Array<{ email: string; verified: boolean }>;
    return emails.some((e) => e.verified && normalizeEmail(e.email) === normalizeEmail(email));
  } catch {
    return false;
  }
}

/**
 * NextAuth.js v5 configuration
 * Supports credentials (email/password) and OAuth (GitHub, Google when configured)
 */

const providers: Provider[] = [
  // Credentials provider for email/password login
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, request) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }
      // Slow down password guessing against one account, and across accounts from one address
      const email = normalizeEmail(String(credentials.email));
      const limited = await rateLimit("signIn", email);
      if (!limited.ok) throw new TooManyAttempts();
      const fromIp = await rateLimit("signInIp", clientIp(request));
      if (!fromIp.ok) throw new TooManyAttempts();

      // Case-insensitive: accounts made before emails were lower-cased still sign in
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });

      if (!user || !user.password) {
        return null;
      }

      const isPasswordValid = await compare(credentials.password as string, user.password);

      if (!isPasswordValid) {
        return null;
      }
      if (!user.emailVerified) throw new UnverifiedEmail();
      // Suspended by an admin: the right password still doesn't open the account
      if (user.suspendedAt) throw new SuspendedAccount();

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

// OAuth providers are only registered when their credentials exist
if (env().AUTH_GITHUB_ID && env().AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({ clientId: env().AUTH_GITHUB_ID, clientSecret: env().AUTH_GITHUB_SECRET })
  );
}
if (env().AUTH_GOOGLE_ID && env().AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({ clientId: env().AUTH_GOOGLE_ID, clientSecret: env().AUTH_GOOGLE_SECRET })
  );
}

/**
 * Load the user's role, promoting the bootstrap admin on first sight.
 */
async function resolveRole(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true, emailVerified: true },
  });
  if (!user) return "LEARNER" as const;

  // The bootstrap email only ever makes the first admin, once verified (lib/admin/bootstrap.ts)
  if (
    promotesToAdmin(
      { email: user.email, verified: Boolean(user.emailVerified), role: user.role },
      {
        bootstrapEmail: env().ADMIN_BOOTSTRAP_EMAIL,
        adminExists: Boolean(await prisma.user.findFirst({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, select: { id: true } })),
      }
    )
  ) {
    // The first admin has full control
    await prisma.user.update({ where: { id: userId }, data: { role: "SUPER_ADMIN" } });
    return "SUPER_ADMIN" as const;
  }
  return user.role;
}

export const authConfig = {
  providers,

  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
    newUser: "/dashboard", // Redirect new users to dashboard
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "credentials") {
        // Google says whether it verified the address; an unverified one could belong to anybody
        if (account?.provider === "google" && (profile as { email_verified?: boolean } | undefined)?.email_verified !== true) {
          return false;
        }
        // GitHub sends the primary address whether or not it's verified: ask GitHub which it is
        if (account?.provider === "github" && !(await githubEmailVerified(account.access_token, user.email))) {
          return false;
        }
        // A suspended account stays shut whichever way it signs in
        if (user.email) {
          const existing = await prisma.user.findFirst({
            where: { email: { equals: normalizeEmail(user.email), mode: "insensitive" } },
            select: { suspendedAt: true },
          });
          if (existing?.suspendedAt) return "/auth/signin?suspended=1";
          // A first Google or GitHub sign-in is a sign-up: a barred address can't make an account
          if (!existing && (await isEmailBlocked(user.email))) return "/auth/signin?blocked=1";
        }
        return true;
      }

      // For credentials, check if email is verified
      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: normalizeEmail(user.email ?? ""), mode: "insensitive" } },
      });

      if (!existingUser?.emailVerified) {
        return false;
      }

      return true;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.email = token.email!;
        session.user.name = token.name;
        session.user.image = token.picture;
        session.user.role = token.role ?? "LEARNER";
      }
      return session;
    },

    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.role = await resolveRole(user.id);
      }

      // Client-triggered updates may only change display fields. Identity
      // fields (sub, email, role) must never come from the client.
      if (trigger === "update" && token.sub) {
        const data = (session ?? {}) as { name?: unknown; image?: unknown };
        if (typeof data.name === "string") token.name = data.name;
        if (typeof data.image === "string") token.picture = data.image;
        token.role = await resolveRole(token.sub);
      }

      return token;
    },
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      // Create streak record for new users
      if (isNewUser && user.id) {
        await prisma.streak.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id, currentStreak: 0, longestStreak: 0 },
        });
        // A first GitHub or Google sign-in is a sign-up (the form's sign-ups notify from their route)
        if (user.email) {
          await notifySignup({ id: user.id, name: user.name ?? null, email: user.email }, `${account?.provider ?? "OAuth"} sign-in`);
        }
      }
    },

    async linkAccount({ user }) {
      // Update email verification when OAuth account is linked
      await prisma.user.update({
        where: { id: user.id! },
        data: { emailVerified: new Date() },
      });
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: env().AUTH_SECRET,
} satisfies NextAuthConfig;
