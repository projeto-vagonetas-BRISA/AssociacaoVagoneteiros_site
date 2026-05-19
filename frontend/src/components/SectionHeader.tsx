interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  titleSize?: 'large' | 'medium';
  labelColor?: string;
}

export function SectionHeader({ label, title, description, titleSize = 'medium', labelColor = '#b61722' }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 items-start w-full">
      {label && (
        <div className="flex gap-3 items-center">
          <div className="h-1 w-12" style={{ backgroundColor: labelColor }} />
          <p className="font-bold text-sm tracking-widest uppercase" style={{ color: labelColor }}>
            {label}
          </p>
        </div>
      )}

      <h2 
        className={`font-bold text-[#005f9d] uppercase ${
          titleSize === 'large' 
            ? 'text-5xl tracking-tighter leading-none' 
            : 'text-4xl tracking-tight leading-10'
        }`}
      >
        {title}
      </h2>

      {description && (
        <p className="text-lg text-[#414752] leading-relaxed max-w-3xl">
          {description}
        </p>
      )}
    </div>
  );
}