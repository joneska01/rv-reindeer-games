import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Panel } from "@/components/shared/Panel";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Host's Table — RV Reindeer Games" };

export default async function LoginPage() {
  const session = await getSession();
  if (session.isAdmin) redirect("/admin/setup");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="eyebrow mb-2">RV Reindeer Games</p>
          <h1 className="text-gilt text-3xl">Host&rsquo;s Table</h1>
          <p className="mt-2 text-sm text-sage">
            For the host and co-conspirators only.
          </p>
        </div>

        <Panel>
          <LoginForm />
        </Panel>

        <p className="mt-6 text-center text-xs text-sage/60">
          <Link href="/" className="underline-offset-4 hover:underline">
            ← Back to the entrance
          </Link>
        </p>
      </div>
    </main>
  );
}
