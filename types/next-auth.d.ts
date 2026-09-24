import type { DefaultSession } from "next-auth";

type AppRole = "LEARNER" | "AUTHOR" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: AppRole;
  }
}
