import type { ComponentProps } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

// Kontrast (WCAG AA): blush-100 på mauve-700 = 9,2:1. blush-300 på plum-950 = 11,1:1.
const variants: Record<Variant, string> = {
  primary: 'border border-blush-300/40 bg-mauve-700 text-blush-100 hover:bg-mauve-500',
  secondary: 'border border-blush-300/60 bg-transparent text-blush-100 hover:bg-plum-900',
  ghost: 'text-blush-300 underline-offset-4 hover:text-blush-100 hover:underline',
  // Ljus knapp med mörk text: tydligt annorlunda, för val som inte går att ångra. plum-950 på blush-100 = hög kontrast.
  danger: 'border border-blush-100 bg-blush-100 text-plum-950 hover:bg-blush-300',
}

// Använd även på <Link>: <Link className={buttonStyles('secondary')}>
export function buttonStyles(variant: Variant = 'primary') {
  return `${base} ${variants[variant]}`
}

// ComponentProps<'button'> tar också emot ref (React 19)
type ButtonProps = ComponentProps<'button'> & { variant?: Variant }

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`${buttonStyles(variant)} ${className}`} {...props} />
}
