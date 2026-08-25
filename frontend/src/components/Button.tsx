import { ArrowRight, Star, Image, PlaneTakeoff, MapPin, Upload, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ButtonProps {
  text: string;
  variant?: "primary" | "secondary" | "outline" | "white" | "instagram";
  icon?: "arrow" | "star" | "image" | "plane" | "pin" | "upload" | "instagram";
  onClick?: () => void;
  to?: string;
}

export function Button({ text, variant = "primary", icon, onClick, to }: ButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else if (onClick) {
      onClick();
    }
  };

  // dicionário de estilos para cada variante (Base, Hover e Cor do Texto)

  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return "bg-blue hover:bg-blue-dark text-white";
      case "outline":
        return "backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-white";
      case "white":
        return "bg-white hover:bg-gray-100 text-blue";
      case "instagram":
        return "bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] hover:from-[#e14e1c] hover:via-[#c21f6d] hover:to-[#702d9c] text-white";
      default:
        return "bg-red-dark hover:bg-red-hover text-white";
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
      case "instagram": return <Camera {...props} />;
      default:      return null;
    }
  };

  return (
    <button
      onClick={handleClick}
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
