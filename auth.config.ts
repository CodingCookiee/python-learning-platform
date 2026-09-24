import type { NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { env, isBootstrapAdmin } from "@/lib/env";

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
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      });

      if (!user || !user.password) {
        return null;
      }

      const isPasswordValid = await compare(credentials.password as string, user.password);

      if (!isPasswordValid) {
        return null;
      }

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
    select: { email: true, role: true },
  });
  if (!user) return "LEARNER" as const;

  if (user.role !== "ADMIN" && isBootstrapAdmin(user.email)) {
    await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
    return "ADMIN" as const;
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
    async signIn({ user, account }) {
      // Allow OAuth without email verification
      if (account?.provider !== "credentials") {
        return true;
      }

      // For credentials, check if email is verified
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email! },
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
    async signIn({ user, isNewUser }) {
      // Create streak record for new users
      if (isNewUser && user.id) {
        await prisma.streak.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id, currentStreak: 0, longestStreak: 0 },
        });
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
