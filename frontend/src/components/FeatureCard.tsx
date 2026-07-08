import React from "react";

interface FeatureCardProps {
  title: string;
  description: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ title, description }) => {
  return (
    <div className="bg-white/10 border border-white/15 rounded-xl p-4 flex flex-col gap-2">
      <p className="font-bold text-sm text-white leading-snug">{title}</p>
      <p className="font-normal text-sm text-white/70 leading-relaxed text-justify md:text-left">{description}</p>
    </div>
  );
};