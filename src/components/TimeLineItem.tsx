import React from "react";

type TimelineVariant = "blue" | "red" | "green" | "dark";
type TimelineSide = "left" | "right";

interface TimelineItemProps {
  year: string;
  title: string;
  description: string;
  variant: TimelineVariant;
  side: TimelineSide;
}

const variantStyles: Record<TimelineVariant, { year: string; dot: string }> = {
  blue:  { year: "text-[#005f9d]", dot: "bg-[#005f9d]" },
  red:   { year: "text-[#b61722]", dot: "bg-[#b61722]" },
  green: { year: "text-[#0a872a]", dot: "bg-[#0a872a]" },
  dark:  { year: "text-amber-500", dot: "bg-[#181c21]" },
};

export const TimelineItem: React.FC<TimelineItemProps> = ({
  year,
  title,
  description,
  variant,
  side,
}) => {
  const styles = variantStyles[variant];

  const textBlock = (
    <div className="flex flex-col gap-2">
      <span className={`font-bold text-4xl md:text-5xl tracking-tight leading-none ${styles.year}`}>
        {year}
      </span>
      <p className="font-bold text-base text-[#181c21]">{title}</p>
      <p className="font-normal text-sm text-[#414752] leading-relaxed">{description}</p>
    </div>
  );

  const photoBlock = (
    <div className="w-full rounded-xl overflow-hidden shadow-md bg-[#dde2ee] h-44 md:h-52 flex items-center justify-center">
      {/* img */}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_60px_1fr] gap-4 md:gap-0 items-center relative z-10">

      {/* esquerda */}
      <div className={`${side === "left" ? "md:text-right md:pr-10" : "md:pr-10"}`}>
        {side === "left" ? textBlock : photoBlock}
      </div>

      {/* ponto do meio */}
      <div className="hidden md:flex flex-col items-center justify-center">
        <div className={`w-10 h-10 rounded-full ${styles.dot} flex items-center justify-center shadow-md`}>
          <span className="w-2.5 h-2.5 rounded-full bg-white/80 block" />
        </div>
      </div>

      {/* direita */}
      <div className={`${side === "right" ? "md:pl-10" : "md:pl-10"}`}>
        {side === "right" ? textBlock : photoBlock}
      </div>
    </div>
  );
};