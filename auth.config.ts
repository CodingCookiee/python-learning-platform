import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * NextAuth.js v5 configuration
 * Supports credentials (email/password) and OAuth (GitHub, Google)
 */

export const authConfig = {
  providers: [
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

    // GitHub OAuth provider
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),

    // Google OAuth provider
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

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
      }
      return session;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }

      // Update token on session update
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }

      return token;
    },
  },

  events: {
    async signIn({ user, isNewUser }) {
      // Create streak record for new users
      if (isNewUser) {
        await prisma.streak.create({
          data: {
            userId: user.id!,
            currentStreak: 0,
            longestStreak: 0,
          },
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

  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
