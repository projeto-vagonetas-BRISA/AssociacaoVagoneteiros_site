interface TimelineCardProps {
  year: string;
  title: string;
  description: string;
  variant: 'blue' | 'red' | 'green' | 'dark';
}

export function TimelineCard({ year, title, description, variant }: TimelineCardProps) {
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'blue':
        return {
          card: 'bg-[#f8f9ff] border-l-4 border-[#005f9d] shadow-sm',
          year: 'text-[#005f9d]/80',
          title: 'text-[#005f9d]',
          desc: 'text-[#414752]'
        };
      case 'red':
        return {
          card: 'bg-[#f8f9ff] border-l-4 border-[#b61722] shadow-sm',
          year: 'text-[#b61722]/90',
          title: 'text-[#005f9d]',
          desc: 'text-[#414752]'
        };
      case 'green':
        return {
          card: 'bg-[#f8f9ff] border-l-4 border-[#0a872a] shadow-sm',
          year: 'text-[#0a872a]/90',
          title: 'text-[#005f9d]',
          desc: 'text-[#414752]'
        };
      case 'dark':
        return {
          card: 'bg-[#005f9d] shadow-xl',
          year: 'text-white/90', 
          title: 'text-white',
          desc: 'text-white/70'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`relative p-8 transition-transform duration-300 hover:-translate-y-2 ${styles.card}`}>
      <div className="flex flex-col gap-4">
        
        <p className={`font-bold text-3xl leading-9 ${styles.year}`}>
          {year}
        </p>

        <h3 className={`font-bold text-xl leading-7 ${styles.title}`}>
          {title}
        </h3>

        <p className={`text-sm leading-relaxed ${styles.desc}`}>
          {description}
        </p>
        
      </div>
    </div>
  );
}