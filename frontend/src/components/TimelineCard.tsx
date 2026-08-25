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
          card: 'bg-bg-light-2 border-l-4 border-blue shadow-sm',
          year: 'text-blue/80',
          title: 'text-blue',
          desc: 'text-text-primary'
        };
      case 'red':
        return {
          card: 'bg-bg-light-2 border-l-4 border-red-dark shadow-sm',
          year: 'text-red-dark/90',
          title: 'text-blue',
          desc: 'text-text-primary'
        };
      case 'green':
        return {
          card: 'bg-bg-light-2 border-l-4 border-green-timeline shadow-sm',
          year: 'text-green-timeline/90',
          title: 'text-blue',
          desc: 'text-text-primary'
        };
      case 'dark':
        return {
          card: 'bg-blue shadow-xl',
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

        <p className={`text-sm leading-relaxed text-justify md:text-left ${styles.desc}`}>
          {description}
        </p>
        
      </div>
    </div>
  );
}
