/**
 * Deadpan one-line verdicts keyed by category × score band.
 * Comedy app — be slightly generous, never cruel.
 */

type Band = "elite" | "solid" | "mid" | "low";

function band(score: number): Band {
  if (score >= 8.0) return "elite";
  if (score >= 6.5) return "solid";
  if (score >= 5.0) return "mid";
  return "low";
}

const FACE_VERDICTS: Record<string, Record<Band, string[]>> = {
  eyes: {
    elite: ["the eyes mog.", "hunter eyes confirmed.", "canthal tilt is doing god's work."],
    solid: ["the eyes are doing fine.", "eye game intact."],
    mid: ["eyes present and accounted for.", "solid eye game."],
    low: ["the eyes have character.", "unique eye shape."],
  },
  skin: {
    elite: ["skin is rendering at 4K.", "skin needs a cease and desist."],
    solid: ["skin is holding up.", "complexion is cooperating."],
    mid: ["skin looks good.", "the skin is clear."],
    low: ["natural look.", "skin has a vibe."],
  },
  jawline: {
    elite: ["jawline is doing its job.", "the jaw mogs.", "carved from limestone."],
    solid: ["jawline is solid.", "jaw is showing up."],
    mid: ["jawline is clean.", "jaw is looking good."],
    low: ["soft jaw energy.", "relaxed jawline."],
  },
  hair: {
    elite: ["the hairline is holding the line.", "hair is unbothered."],
    solid: ["hairline is intact.", "hair is doing its job."],
    mid: ["hair is looking good.", "the hair is showing up."],
    low: ["clean look.", "hair has potential."],
  },
  symmetry: {
    elite: ["symmetric like a Greek column.", "mirror-perfect."],
    solid: ["symmetry is reliable.", "left and right agree."],
    mid: ["mostly symmetric.", "good balance overall."],
    low: ["unique proportions.", "character in the asymmetry."],
  },
  harmony: {
    elite: ["facial harmony is locked in.", "thirds and fifths approve."],
    solid: ["proportions are cooperating.", "the math checks out."],
    mid: ["solid proportions.", "harmony is present."],
    low: ["distinctive features.", "interesting proportions."],
  },
};

const PHYSIQUE_VERDICTS: Record<string, Record<Band, string[]>> = {
  definition: {
    elite: ["shredded. scanner confirmed.", "abs rendering at 4K.", "definition is locked in."],
    solid: ["definition is present.", "ab structure is showing."],
    mid: ["some definition visible.", "looking solid."],
    low: ["definition in progress.", "foundation is there."],
  },
  symmetry: {
    elite: ["perfectly balanced.", "bilateral symmetry: verified.", "left and right agree."],
    solid: ["symmetry is cooperating.", "even distribution."],
    mid: ["mostly even.", "good balance overall."],
    low: ["unique bilateral structure.", "character on both sides."],
  },
  tone: {
    elite: ["skin tone is clean.", "even and consistent.", "tone is locked."],
    solid: ["tone is solid.", "good consistency."],
    mid: ["decent tone.", "clean enough."],
    low: ["natural complexion.", "skin has a look."],
  },
  lines: {
    elite: ["ab lines are drawing lines.", "the grid is visible.", "six-pack confirmed."],
    solid: ["lines are showing.", "ab structure is there."],
    mid: ["some lines present.", "structure is building."],
    low: ["lines incoming.", "potential is real."],
  },
  conditioning: {
    elite: ["lower abs are doing press conferences.", "v-cut confirmed.", "conditioning: elite."],
    solid: ["conditioning is showing.", "lower abs engaged."],
    mid: ["lower region looking solid.", "conditioning is there."],
    low: ["foundation mode.", "base conditioning present."],
  },
};

const ALL_VERDICTS = { ...FACE_VERDICTS, ...PHYSIQUE_VERDICTS };

export function verdictFor(category: string, score: number): string {
  const b = band(score);
  const pool = ALL_VERDICTS[category.toLowerCase()]?.[b] ?? ["scored."];
  const idx = Math.floor((score * 10) % pool.length);
  return pool[idx];
}
