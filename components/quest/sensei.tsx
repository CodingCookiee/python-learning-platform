import { cn } from "@/lib/utils";

export type SenseiMood = "calm" | "pleased";

/**
 * The quest's guide, drawn as printed line art: keyline edges and flat token fills, so it reads in
 * both themes. The gi and the black belt's knot are cut like the logo; the head is round with
 * ink-line features (no pixel squares, so it isn't an 8-bit sprite in a printed syllabus). Calm for
 * the steps; pleased (eyes closed in a smile, head tilted, straw-yellow sparks) for the farewell.
 * Decorative by default: the speech bubble beside it carries the words. `head` crops to the head,
 * for the minimised pill.
 */
export function Sensei({
  mood = "calm",
  head = false,
  className,
  title,
}: {
  mood?: SenseiMood;
  head?: boolean;
  className?: string;
  title?: string;
}) {
  const pleased = mood === "pleased";
  return (
    <svg
      viewBox={head ? "18 1 28 34" : "0 0 64 72"}
      className={cn(head ? "size-7 shrink-0" : "h-18 w-16 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      data-mood={mood}
    >
      <g stroke="var(--keyline)" strokeWidth="1.5" strokeLinejoin="miter">
        {/* neck, then the gi, cropped at the bottom edge */}
        <path d="M28 31 V37 H36 V31" fill="var(--belt-white)" />
        <path d="M13 74 V45 L21 35.5 H43 L51 45 V74" fill="var(--primary)" />
        {/* chest, then the lapels crossing right over left */}
        <path d="M26.5 35.5 H37.5 L32 46 Z" fill="var(--belt-white)" />
        <path d="M37.5 35.5 H41.5 L31 52 H27 Z" fill="var(--tape)" />
        <path d="M22.5 35.5 H26.5 L37 52 H33 Z" fill="var(--tape)" />
        {/* the black belt, its knot and tails, as in the logo */}
        <rect x="13" y="52" width="38" height="5" fill="var(--belt-black)" />
        <path d="M29.6 58.5 H32.6 L29.2 68 H26.2 Z" fill="var(--belt-black)" />
        <path d="M31.4 58.5 H34.4 L37.8 68 H34.8 Z" fill="var(--belt-black)" />
        <rect x="28.5" y="50.5" width="7" height="8.5" fill="var(--belt-black)" />
        <path d="M28.5 52.6 L35.5 56.6" fill="none" />
        {/* sleeves, the arms hanging over the belt's ends */}
        <path d="M13 74 V45 L19 38.5 L21.5 47 V74" fill="var(--primary)" />
        <path d="M51 74 V45 L45 38.5 L42.5 47 V74" fill="var(--primary)" />
      </g>

      <g transform={pleased ? "rotate(-5 32 34)" : undefined}>
        <g stroke="var(--keyline)" strokeWidth="1.5">
          {/* topknot, head, then the hair as a cap over the crown */}
          <circle cx="32" cy="8" r="3.5" fill="var(--belt-black)" />
          <circle cx="32" cy="21.5" r="11.5" fill="var(--belt-white)" />
          <path
            d="M20.6 20 A11.5 11.5 0 0 1 43.4 20 C36.5 16.6 27.5 16.6 20.6 20 Z"
            fill="var(--belt-black)"
            strokeLinejoin="round"
          />
        </g>
        {/* the face, inked in belt black so it holds on the light skin in both themes */}
        <g stroke="var(--belt-black)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {pleased ? (
            <>
              <path d="M25.4 25 Q27.4 22.5 29.4 25" />
              <path d="M34.6 25 Q36.6 22.5 38.6 25" />
            </>
          ) : (
            <path d="M29.4 28.8 Q32 30.8 34.6 28.8" />
          )}
        </g>
        {pleased ? (
          <path
            d="M28.8 28 Q32 32.6 35.2 28 Z"
            fill="var(--belt-black)"
            stroke="var(--belt-black)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        ) : (
          <g fill="var(--belt-black)">
            <circle cx="27.5" cy="24.2" r="1.45" />
            <circle cx="36.5" cy="24.2" r="1.45" />
          </g>
        )}
      </g>

      {pleased && (
        // Straw yellow is the colour of something just earned (a fresh stripe): three strokes fanning
        // out from the head
        <g fill="var(--highlight)" stroke="var(--keyline)" strokeWidth="1">
          <rect x="42.4" y="4" width="3" height="6.5" rx="1.5" transform="rotate(40 43.9 7.3)" />
          <rect x="48.4" y="13.45" width="3" height="6.5" rx="1.5" transform="rotate(75 49.9 16.7)" />
          <rect x="16.3" y="6.35" width="3" height="6.5" rx="1.5" transform="rotate(-50 17.8 9.6)" />
        </g>
      )}
    </svg>
  );
}
