import { cn } from "@/lib/utils";

export type SenseiMood = "calm" | "pleased";

/**
 * The quest's guide: a sensei drawn like the belt knot (square cuts, miter joins, keyline edges,
 * flat token fills), so it reads in both themes. A jade gi, a black belt, a topknot. Calm for the
 * steps; pleased (eyes closed in a smile, head tilted, straw-yellow sparks) for the farewell.
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
        <g stroke="var(--keyline)" strokeWidth="1.5" strokeLinejoin="miter">
          {/* topknot, head, hair */}
          <rect x="29" y="4" width="6" height="5.5" fill="var(--belt-black)" />
          <path d="M24 9 H40 L44 13 V26 L37 33 H27 L20 26 V13 Z" fill="var(--belt-white)" />
          <path d="M20 16 V13 L24 9 H40 L44 13 V16 Z" fill="var(--belt-black)" />
        </g>
        {/* the face, inked in belt black so it holds on the light skin in both themes */}
        <g stroke="var(--belt-black)" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" fill="none">
          <path d={pleased ? "M25 18.5 H29.5 M34.5 18.5 H39" : "M25 19 H29.5 M34.5 19 H39"} />
          {pleased ? (
            <>
              <path d="M25.5 23.5 L27.5 21.5 L29.5 23.5" />
              <path d="M34.5 23.5 L36.5 21.5 L38.5 23.5" />
            </>
          ) : (
            <path d="M29.5 28 L30.5 28.75 H33.5 L34.5 28" />
          )}
        </g>
        {pleased ? (
          <path d="M28.5 26.75 H35.5 L34 29.75 H30 Z" fill="var(--belt-black)" />
        ) : (
          <g fill="var(--belt-black)">
            <rect x="26.25" y="21.25" width="2.5" height="2.5" />
            <rect x="35.25" y="21.25" width="2.5" height="2.5" />
          </g>
        )}
      </g>

      {pleased && (
        // Straw yellow is the colour of something just earned (a fresh stripe)
        <g fill="var(--highlight)" stroke="var(--keyline)" strokeWidth="1" strokeLinejoin="miter">
          <rect x="49" y="7" width="5" height="5" transform="rotate(45 51.5 9.5)" />
          <rect x="53.5" y="17" width="3.5" height="3.5" transform="rotate(45 55.25 18.75)" />
          <rect x="9" y="12" width="3.5" height="3.5" transform="rotate(45 10.75 13.75)" />
        </g>
      )}
    </svg>
  );
}
