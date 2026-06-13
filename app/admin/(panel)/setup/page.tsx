import { listYearsWithCounts } from "@/lib/years";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { YearManager, type YearRow } from "@/components/admin/YearManager";

export const metadata = { title: "Setup — RV Reindeer Games" };

export default async function SetupPage() {
  const years = await listYearsWithCounts();
  const rows: YearRow[] = years.map((y) => ({
    id: y.id,
    year: y.year,
    isActive: y.isActive,
    isLocked: y.isLocked,
    isTest: y.isTest,
    teamCount: y.teamCount,
    gameCount: y.gameCount,
  }));

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Setup Mode"
        title="Years &amp; Editions"
      />
      <p className="-mt-4 max-w-2xl text-sm text-sage">
        Each edition of the Games is a year. Create one, optionally copying last
        year&rsquo;s teams, then open it to manage teams and games. Use 9999 for a
        test run you can safely delete.
      </p>
      <YearManager years={rows} />
    </div>
  );
}
