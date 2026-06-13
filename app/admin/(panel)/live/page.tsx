import { getActiveYear } from "@/lib/years";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Panel } from "@/components/shared/Panel";

export const metadata = { title: "Live Event — RV Reindeer Games" };

export default async function LivePage() {
  const active = await getActiveYear();

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Live Mode" title="Run the Event" />
      <Panel>
        {active ? (
          <p className="text-sm text-sage">
            Active edition: <span className="nums text-gilt">{active.year}</span>.
            Game control, score entry, the Naughty List, and the podium reveal
            arrive in the next sub-checkpoint.
          </p>
        ) : (
          <p className="text-sm text-sage">
            No active edition yet. Head to{" "}
            <span className="text-gold-soft">Setup</span> and set one active first.
          </p>
        )}
      </Panel>
    </div>
  );
}
