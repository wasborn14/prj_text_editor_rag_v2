import { cn } from "@/lib/utils/cn"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        {
          'primary': 'bg-blue-600 text-white hover:bg-blue-700',
          'secondary': 'bg-gray-200 text-gray-900 hover:bg-gray-300',
          'ghost': 'hover:bg-gray-100'
        }[variant],
        {
          'sm': 'px-3 py-1.5 text-sm',
          'md': 'px-4 py-2',
          'lg': 'px-6 py-3 text-lg'
        }[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}