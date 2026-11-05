import { Menu } from '@base-ui/react/menu'
import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib/utils'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger

export function DropdownMenuContent({ className, ...props }: ComponentProps<typeof Menu.Popup>) {
  return (
    <Menu.Portal>
      <Menu.Positioner align="end" sideOffset={4} className="z-50">
        <Menu.Popup className={cn('min-w-40 rounded-lg border bg-card p-1 text-card-foreground shadow-md outline-none', className)} {...props} />
      </Menu.Positioner>
    </Menu.Portal>
  )
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Menu.Item>) {
  return <Menu.Item className={cn('cursor-pointer rounded-md px-3 py-2 text-sm outline-none data-highlighted:bg-muted data-disabled:pointer-events-none data-disabled:opacity-50', className)} {...props} />
}
