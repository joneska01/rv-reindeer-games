import { Select } from "@/components/shared/Input";
import {
  scoringKindOf,
  applyScoringKind,
  SCORING_KIND_OPTIONS,
  type ScoringFields,
  type ScoringKind,
} from "@/lib/scoring-kinds";

/**
 * The "Count / Timing / Voting" dropdown shared by the per-edition game form and
 * the library form. It owns the mapping to the stored score_type / score_source /
 * score_unit: pass the current fields, and `onChange` receives the three new ones
 * to merge into your form state.
 */
export function ScoringKindSelect({
  value,
  onChange,
  className,
}: {
  value: ScoringFields;
  onChange: (next: ScoringFields) => void;
  className?: string;
}) {
  return (
    <Select
      value={scoringKindOf(value.scoreType, value.scoreSource)}
      onChange={(e) => onChange(applyScoringKind(e.target.value as ScoringKind, value.scoreUnit))}
      className={className}
    >
      {SCORING_KIND_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
