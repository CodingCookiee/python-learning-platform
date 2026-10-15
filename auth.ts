import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { normalizeEmail } from "@/lib/email-address";

/**
 * NextAuth.js instance with Prisma adapter
 */

const adapter = PrismaAdapter(prisma);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: {
    ...adapter,
    // Accounts from GitHub or Google are stored and looked up lower-cased, like sign-ups (lib/email-address.ts)
    createUser: (user) => adapter.createUser!({ ...user, email: normalizeEmail(user.email) }),
    getUserByEmail: (email) => adapter.getUserByEmail!(normalizeEmail(email)),
  },
  ...authConfig,
});
