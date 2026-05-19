interface BadgeProps {
  text: string;
  variant?: 'primary' | 'secondary';
}

export function Badge({ text, variant = 'primary' }: BadgeProps) {
  const bgColor = variant === 'primary' ? 'bg-[#b61722]' : 'bg-[#005f9d]';

  return (
    <div className={`${bgColor} inline-flex items-center justify-center px-3 py-1 rounded-sm shrink-0 w-fit`}>
      <span className="text-xs text-white tracking-widest uppercase">
        {text}
      </span>
    </div>
  );
}