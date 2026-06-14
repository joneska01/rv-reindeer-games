import Link from "next/link";
import { Snowfall } from "@/components/decor/Snowfall";
import { StringLights } from "@/components/decor/StringLights";
import { Badge } from "@/components/shared/Badge";
import { buttonClass } from "@/components/shared/Button";
import { cn } from "@/lib/cn";

const DESTINATIONS = [
  {
    href: "/scoreboard",
    glyph: "🏆",
    title: "The Scoreboard",
    blurb: "The live standings, for the big screen. Where bragging rights are minted.",
    cta: "Open the room display",
  },
  {
    href: "/vote",
    glyph: "🥂",
    title: "Costume Ballot",
    blurb: "Cast your votes for the night's finest attire. Self-voting is gauche but legal.",
    cta: "Cast your ballot",
  },
  {
    href: "/history",
    glyph: "📜",
    title: "Hall of Records",
    blurb: "Champions past, preserved for posterity (and for settling arguments).",
    cta: "Browse the archives",
  },
  {
    href: "/admin/login",
    glyph: "🔔",
    title: "Host's Table",
    blurb: "Run the show — scores, the Naughty List, and the podium reveal.",
    cta: "Enter the host panel",
  },
];

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <main className="relative flex flex-1 flex-col">
      <Snowfall count={36} />
      <StringLights className="absolute inset-x-0 top-0 opacity-90" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-6 pb-16 pt-20 text-center">
        {/* Crest */}
        <div className="animate-rise mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gilt-strong bg-forest-deep/60 shadow-[0_0_40px_-8px_rgba(212,175,55,0.45)]">
          <span className="text-gilt font-display text-2xl tracking-[0.1em]">RV</span>
        </div>

        <p className="eyebrow animate-rise mb-4" style={{ animationDelay: "60ms" }}>
          Annual Holiday Championship · {year}
        </p>

        <h1
          className="text-gilt animate-rise text-5xl leading-[1.05] sm:text-7xl"
          style={{ animationDelay: "120ms" }}
        >
          Reindeer Games
        </h1>

        <p
          className="animate-rise mt-5 max-w-xl text-lg text-sage"
          style={{ animationDelay: "180ms" }}
        >
          Couples compete. Cocoa is spiked. Demerits are issued with great
          ceremony. One gilded scoreboard settles it all.
        </p>

        <div
          className="animate-rise mt-7 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "240ms" }}
        >
          <Link href="/scoreboard" className={buttonClass("gold", "lg")}>
            Open the Scoreboard
          </Link>
          <Link href="/vote" className={buttonClass("ghost", "lg")}>
            Cast Your Ballot
          </Link>
        </div>

        {/* Destinations */}
        <div className="mt-16 grid w-full gap-4 sm:grid-cols-2">
          {DESTINATIONS.map((d, i) => (
            <Link
              key={d.href}
              href={d.href}
              className={cn(
                "frame-gilt animate-rise group flex flex-col rounded-panel bg-panel/60 p-6 text-left backdrop-blur-sm",
                "transition-[transform,border-color,background-color] duration-200",
                "hover:-translate-y-0.5 hover:border-gilt-strong hover:bg-panel/80",
              )}
              style={{ animationDelay: `${300 + i * 70}ms` }}
            >
              <span className="mb-3 text-3xl leading-none">{d.glyph}</span>
              <h3 className="text-gilt text-xl">{d.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-cream/70">{d.blurb}</p>
              <span className="mt-4 font-display text-xs uppercase tracking-[0.18em] text-gold-soft/70 transition-colors group-hover:text-gold-soft">
                {d.cta} <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </div>

        <footer className="mt-16 flex items-center gap-3 text-xs text-sage/60">
          <Badge tone="gold">Est. 2023</Badge>
          <span className="font-body italic">
            Tasteful chaos, scored to the point.
          </span>
        </footer>
      </div>
    </main>
  );
}
