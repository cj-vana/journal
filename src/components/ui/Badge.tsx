import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface BadgeProps {
  color: string
  children: ReactNode
  className?: string
}

export default function Badge({ color, children, className }: BadgeProps) {
  return (
    <span
      className={cn('rounded-full px-3 py-1 text-sm font-medium inline-block', className)}
      style={{ backgroundColor: `${color}20`, color }}
    >
      {children}
    </span>
  )
}
