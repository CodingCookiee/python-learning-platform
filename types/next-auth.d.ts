import type { DefaultSession } from "next-auth";

type AppRole = "LEARNER" | "AUTHOR" | "ADMIN" | "SUPER_ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      /** The account's sessionVersion when this session signed in (lib/session-version.ts) */
      sessionVersion: number;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: AppRole;
    sessionVersion?: number;
  }
}
