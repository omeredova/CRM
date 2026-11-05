import type { ComponentProps } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative w-full min-w-0">
      <select className={cn('peer flex h-9 w-full min-w-0 appearance-none rounded-lg border border-input bg-background py-1 pr-9 pl-3 text-base text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive md:text-sm', className)} {...props} />
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground peer-disabled:opacity-50" />
    </div>
  )
}
