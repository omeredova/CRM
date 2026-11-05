import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib/utils'

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn('flex min-h-24 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive md:text-sm', className)} {...props} />
}
