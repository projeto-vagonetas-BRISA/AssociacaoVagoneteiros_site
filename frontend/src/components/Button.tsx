import { ArrowRight, Star, Image, PlaneTakeoff, MapPin, Upload } from "lucide-react";

interface ButtonProps {
  text: string;
  variant?: "primary" | "secondary" | "outline" | "white";
  icon?: "arrow" | "star" | "image" | "plane" | "pin" | "upload";
  onClick?: () => void;
}

export function Button({ text, variant = "primary", icon, onClick }: ButtonProps) {
  // dicionário de estilos para cada variante (Base, Hover e Cor do Texto)

  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return "bg-[#005f9d] hover:bg-[#004c7d] text-white";
      case "outline":
        return "backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-white";
      case "white":
        return "bg-white hover:bg-gray-100 text-[#005f9d]";
      default:
        return "bg-[#b61722] hover:bg-[#9a131c] text-white";
    }
  };

  const getIcon = () => {
    const props = { size: 18, strokeWidth: 2, className: "shrink-0" };
    switch (icon) {
      case "arrow": return <ArrowRight {...props} />;
      case "star":  return <Star {...props} />;
      case "image": return <Image {...props} />;
      case "upload": return <Upload {...props} />;
      case "plane": return <PlaneTakeoff {...props} />;
      case "pin":   return <MapPin {...props} />;
      default:      return null;
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        ${getVariantStyles()}
        flex items-center justify-center gap-3 px-8 py-4 rounded-lg shrink-0 shadow-xl
        transition-all duration-200 active:scale-95 cursor-pointer
      `}
    >
      <span className="font-bold text-sm tracking-[1.4px] uppercase leading-5">
        {text}
      </span>
      {getIcon()}
    </button>
  );
}