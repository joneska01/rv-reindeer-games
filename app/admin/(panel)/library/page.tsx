import { listLibrary } from "@/lib/setup";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { LibraryManager, type LibraryEntry } from "@/components/admin/LibraryManager";

export const metadata = { title: "Game Library — RV Reindeer Games" };

export default async function LibraryPage() {
  const library = await listLibrary();
  const entries: LibraryEntry[] = library.map((l) => ({
    id: l.id,
    name: l.name,
    scoreType: l.scoreType,
    scoreSource: l.scoreSource,
    scoreUnit: l.scoreUnit,
    defaultNumRounds: l.defaultNumRounds,
    supplies: l.supplies,
    notes: l.notes,
  }));

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Setup Mode"
        title="Game Library"
      />
      <p className="-mt-4 max-w-2xl text-sm text-sage">
        A shared catalogue of reusable games. Pull these into any edition, tweak as
        needed. Edits here are global and don&rsquo;t touch editions already using a game.
      </p>
      <LibraryManager entries={entries} />
    </div>
  );
}
