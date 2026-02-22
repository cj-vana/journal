import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type CardVariant = 'default' | 'hover' | 'interactive'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

const variantStyles: Record<CardVariant, string> = {
  default: '',
  hover: 'hover:shadow-md transition-shadow',
  interactive: 'cursor-pointer hover:shadow-md transition-shadow',
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white border border-warm-200 rounded-2xl shadow-sm p-4',
          variantStyles[variant],
          className
        )}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'
export default Card
