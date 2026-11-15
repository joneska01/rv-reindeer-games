import { listLibrary } from "@/lib/setup";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { LibraryManager } from "@/components/admin/LibraryManager";
import { toLibraryGameVM } from "@/lib/view-models";

export const metadata = { title: "Game Library — RV Reindeer Games" };

export default async function LibraryPage() {
  const library = await listLibrary();

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
      <LibraryManager entries={library.map(toLibraryGameVM)} />
    </div>
  );
}
