import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogClose = DialogPrimitive.Close

export function DialogContent({ className, ...props }: ComponentProps<typeof DialogPrimitive.Popup>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-foreground/40" />
      <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
        <DialogPrimitive.Popup className={cn('max-h-full w-full max-w-lg overflow-y-auto rounded-xl border bg-card p-6 text-card-foreground shadow-lg outline-none', className)} {...props} />
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  )
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('break-words text-lg font-semibold', className)} {...props} />
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('break-words text-sm text-muted-foreground', className)} {...props} />
}
