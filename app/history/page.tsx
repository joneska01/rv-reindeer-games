import Link from "next/link";
import { HISTORICAL_YEARS, type HistoricalYear } from "@/lib/historical";
import { Snowfall } from "@/components/decor/Snowfall";
import { Panel } from "@/components/shared/Panel";
import { Badge } from "@/components/shared/Badge";
import { Medal } from "@/components/shared/Medal";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { buttonClass } from "@/components/shared/Button";
import { TeamDot } from "@/components/shared/TeamDot";

export const metadata = { title: "Hall of Records — RV Reindeer Games" };

export default function HistoryPage() {
  // Museum fixtures only; test years never appear in public history.
  const years = HISTORICAL_YEARS.filter((y) => !y.is_test).sort((a, b) => b.year - a.year);

  return (
    <main className="relative flex min-h-dvh flex-col">
      <Snowfall count={24} />
      <div className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <div className="mb-10 flex items-center justify-between gap-4">
          <SectionHeading eyebrow="Archives" title="Hall of Records" />
          <Link href="/" className={buttonClass("ghost", "sm")}>
            ← Home
          </Link>
        </div>

        <div className="space-y-8">
          {years.map((y) => (
            <YearCard key={y.year} year={y} />
          ))}
        </div>

        <p className="mt-12 text-center text-xs italic text-sage/50">
          Results preserved verbatim from the original ledgers — quirks and all.
        </p>
      </div>
    </main>
  );
}

function YearCard({ year }: { year: HistoricalYear }) {
  const standings = [...year.teams].sort((a, b) => a.final_rank - b.final_rank);
  const champ = standings.find((t) => t.final_rank === 1);
  const countedGames = year.games.filter((g) => g.counted).length;

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-gilt font-display text-3xl">{year.year}</h2>
          {champ && <Badge tone="gold">🏆 {champ.name}</Badge>}
        </div>
        <span className="nums text-xs text-sage/60">
          {countedGames} games scored
        </span>
      </div>

      <ol className="space-y-1.5">
        {standings.map((t) => (
          <li
            key={t.name}
            className="frame-gilt flex items-center gap-3 rounded-card bg-panel/50 px-3 py-2"
          >
            <span className="flex w-8 justify-center">
              <Medal rank={t.final_rank} />
            </span>
            <TeamDot color={t.display_color} />
            <span className="flex-1 truncate font-body text-cream">{t.name}</span>
            <span className="nums text-lg text-gilt">{t.final_total}</span>
          </li>
        ))}
      </ol>

      {year.notes && (
        <p className="mt-4 border-t border-gilt/20 pt-3 text-xs italic leading-relaxed text-sage/60">
          {year.notes}
        </p>
      )}
    </Panel>
  );
}
