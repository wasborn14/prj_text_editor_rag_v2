import { cn } from "@/lib/utils/cn"

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
  const sizeClasses = {
    'sm': 'w-6 h-6',
    'md': 'w-8 h-8',
    'lg': 'w-12 h-12'
  }

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(
          "rounded-full object-cover",
          sizeClasses[size],
          className
        )}
      />
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