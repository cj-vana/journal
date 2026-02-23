import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    const errorId = inputId ? `${inputId}-error` : undefined

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-warm-800 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5',
            'focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none transition-colors',
            error && 'border-rose-600 focus:ring-rose-400 focus:border-rose-600',
            className
          )}
          {...props}
        />
        {error && <p id={errorId} role="alert" className="mt-1 text-sm text-rose-600">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
