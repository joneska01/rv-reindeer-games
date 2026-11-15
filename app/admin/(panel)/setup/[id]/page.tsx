import Link from "next/link";
import { notFound } from "next/navigation";
import { getYear } from "@/lib/years";
import { listTeams, listGames, listLibrary } from "@/lib/setup";
import { Badge } from "@/components/shared/Badge";
import { TeamManager } from "@/components/admin/TeamManager";
import { GameManager } from "@/components/admin/GameManager";
import { ResetEditionButton } from "@/components/admin/ResetEditionButton";
import { toTeamVM, toGameVM, toLibraryGameVM } from "@/lib/view-models";
import { ErrorNote } from "@/components/shared/ErrorNote";

export default async function YearSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const year = await getYear(id);
  if (!year) notFound();

  const [teams, games, library] = await Promise.all([
    listTeams(id),
    listGames(id),
    listLibrary(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/setup" className="eyebrow mb-2 inline-block hover:text-gold">
          ← All editions
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-gilt text-3xl">Edition {year.year}</h1>
          {year.isActive && <Badge tone="gold">Active</Badge>}
          {year.isLocked && <Badge tone="cranberry">Locked</Badge>}
          {year.isTest && <Badge tone="amber">⚠ Test</Badge>}
        </div>
      </div>

      {year.isTest && (
        <p className="rounded-card border border-amber/50 bg-amber/10 px-4 py-2.5 text-sm text-amber">
          Test Mode — this edition won&rsquo;t appear in public history and can be deleted.
        </p>
      )}

      {year.isLocked && (
        <ErrorNote>
          This edition is locked — teams and games are read-only.
        </ErrorNote>
      )}

      <TeamManager yearId={year.id} teams={teams.map(toTeamVM)} locked={year.isLocked} />
      <GameManager
        yearId={year.id}
        games={games.map(toGameVM)}
        library={library.map(toLibraryGameVM)}
        locked={year.isLocked}
      />

      {year.isTest && <ResetEditionButton yearId={year.id} year={year.year} />}
    </div>
  );
}
