import { cn } from "@/lib/utils";

/**
 * The examiner's seal: a square vermilion stamp pressed onto passed work.
 */
export function Seal({
  label = "Passed",
  detail,
  animate = false,
  className,
}: {
  label?: string;
  detail?: string;
  animate?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rotate-[-7deg] flex-col items-center justify-center border-[3px] border-seal p-[3px] text-seal",
        animate && "animate-seal-stamp",
        className
      )}
      role="img"
      aria-label={detail ? `${label}: ${detail}` : label}
    >
      <div className="flex flex-col items-center border border-seal px-3 py-1.5">
        <span className="font-condensed text-xl leading-none font-extrabold tracking-[0.06em] uppercase">
          {label}
        </span>
        {detail && (
          <span className="font-condensed mt-1 text-[0.625rem] leading-none font-semibold tracking-[0.08em] uppercase">
            {detail}
          </span>
        )}
      </div>
    </div>
  );
}
