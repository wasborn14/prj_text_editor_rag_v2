import { cn } from "@/lib/utils/cn"
import Image from "next/image"

interface AvatarProps {
  src?: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  className
}) => {
  const sizeMap = {
    'sm': 24,
    'md': 32,
    'lg': 48
  }

  const sizeClasses = {
    'sm': 'w-6 h-6',
    'md': 'w-8 h-8',
    'lg': 'w-12 h-12'
  }

  if (src) {
    return (
      <div className={cn(
        "rounded-full overflow-hidden",
        sizeClasses[size],
        className
      )}>
        <Image
          src={src}
          alt={alt}
          width={sizeMap[size]}
          height={sizeMap[size]}
          className="object-cover w-full h-full"
          unoptimized // GitHub avatars are already optimized
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-full bg-gray-300 flex items-center justify-center text-gray-600",
        sizeClasses[size],
        className
      )}
    >
      <span className="text-xs font-medium">
        {alt.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}