import svgPaths from "../assets/svg-u6pushe3qa";

interface ReviewCardProps {
  name: string;
  location: string;
  comment: string;
  rating: number;
  avatarLetter: string;
  avatarColor: string;
}

export function ReviewCard({ name, location, comment, rating, avatarLetter, avatarColor }: ReviewCardProps) {
  return (
    <div className="bg-white p-8 shadow-sm border border-gray-50">
      <div className="flex flex-col gap-4">
        
        {/* estrelas */}
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <svg 
              key={i} 
              className="size-5 shrink-0" 
              fill="none" 
              viewBox="0 0 20 19"
            >
              <path 
                d={svgPaths.p1f93f980} 
                fill={i < rating ? '#B61722' : '#E0E0E0'} 
              />
            </svg>
          ))}
        </div>

        {/* comentário */}
        <p className="italic text-base text-[#414752] leading-relaxed">
          {comment}
        </p>

        {/* perfil do Usuário */}
        <div className="flex gap-4 items-center pt-2">
          
          <div className={`${avatarColor} flex items-center justify-center rounded-full size-10 shrink-0`}>
            <span className="font-bold text-base text-white">
              {avatarLetter}
            </span>
          </div>

          <div className="flex flex-col">
            <p className="font-bold text-base text-[#005f9d]">
              {name}
            </p>
            <p className="text-xs text-[#414752]">
              {location}
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}