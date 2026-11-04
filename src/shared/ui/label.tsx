import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib/utils'

function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label data-slot="label" className={cn('text-sm font-medium leading-snug', className)} {...props} />
}

export { Label }
