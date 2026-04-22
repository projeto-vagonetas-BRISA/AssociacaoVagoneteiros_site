import svgPaths from "../assets/svg-u6pushe3qa";

interface ButtonProps {
  text: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'white';
  icon?: 'arrow' | 'star' | 'image' | 'plane';
  onClick?: () => void;
}

export function Button({ text, variant = 'primary', icon, onClick }: ButtonProps) {
  
  // dicionário de estilos para cada variante (Base, Hover e Cor do Texto)
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-[#005f9d] hover:bg-[#004c7d] text-white';
      case 'outline':
        return 'backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-white';
      case 'white':
        return 'bg-white hover:bg-gray-100 text-[#005f9d]';
      default: // primary
        return 'bg-[#b61722] hover:bg-[#9a131c] text-white';
    }
  };

  // mpeamento de propriedades dos ícones para deixar o JSX mais limpo
  const getIconProps = () => {
    switch (icon) {
      case 'arrow':
        return { path: svgPaths.p29002e00, size: 'w-5 h-4', viewBox: '0 0 19.5 16' };
      case 'star':
        return { path: svgPaths.p252f1a00, size: 'size-6', viewBox: '0 0 22.6 22.6' };
      case 'image':
        return { path: svgPaths.p2d60240, size: 'size-5', viewBox: '0 0 20 20' };
      case 'plane':
        return { path: svgPaths.p1a406200, size: 'size-4', viewBox: '0 0 16 16' };
      default:
        return null;
    }
  };

  const iconData = getIconProps();

  return (
    <button
      onClick={onClick}
      className={`
        ${getVariantStyles()} 
        flex items-center justify-center gap-3 px-8 py-4 rounded-lg shrink-0 shadow-xl
        transition-all duration-200 active:scale-95
      `}
    >
      <p className="font-bold text-sm tracking-[1.4px] uppercase leading-5">
        {text}
      </p>
      
      {iconData && (
        <svg 
          className={`${iconData.size} shrink-0`} 
          fill="none" 
          viewBox={iconData.viewBox}
        >
          <path 
            d={iconData.path} 
            fill="currentColor" 
          />
        </svg>
      )}
    </button>
  );
}