import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ModulesClient, ModuleData } from "./_components/modules-client";

async function getModules(cookieHeader: string): Promise<ModuleData[]> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const res = await fetch(`${baseUrl}/api/modules`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { modules: ModuleData[]; total: number };
  return data.modules;
}

export default async function ModulesPage() {
  const session = await auth();
  if (!session) {
    redirect("/auth/signin");
  }

  // Forward the session cookie so the API can authenticate
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const modules = await getModules(cookieHeader);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-8">
        {/* Page header */}
        <div className="flex flex-col gap-1">
          <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Learning
          </p>
          <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Modules</h1>
          <p className="text-sm text-muted-foreground">
            Work through each module at your own pace.
          </p>
        </div>

        {/* Client component handles filtering / sorting / rendering */}
        <ModulesClient modules={modules} />
      </div>
    </div>
  );
}
