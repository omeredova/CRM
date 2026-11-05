import { useId, useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react'

import { Button } from './button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './dialog'
import { ModalContext, useModalState } from './modal-context'

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  hideTitle?: boolean
  finalFocus?: ComponentProps<typeof DialogContent>['finalFocus']
  children: ReactNode
}

export function Modal({ open, onOpenChange, title, description, hideTitle, finalFocus, children }: ModalProps) {
  const [pending, setPending] = useState(false)
  const locked = useRef(false)

  function start() {
    if (locked.current) return false
    locked.current = true
    setPending(true)
    return true
  }

  function finish() {
    locked.current = false
    setPending(false)
  }

  return (
    <ModalContext.Provider value={{ pending, start, finish }}>
      <Dialog open={open} onOpenChange={(next) => { if (!locked.current) onOpenChange(next) }}>
        <DialogContent finalFocus={finalFocus} className="grid gap-4">
          <DialogTitle className={hideTitle ? 'sr-only' : undefined}>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
          {open && children}
        </DialogContent>
      </Dialog>
    </ModalContext.Provider>
  )
}

export function ModalCloseButton({ children = 'Закрыть' }: { children?: ReactNode }) {
  const { pending } = useModalState()
  return <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>{children}</DialogClose>
}

export function ModalForm({ onSubmit, onSuccess, submitLabel = 'Сохранить', pendingLabel = 'Сохраняем…', destructive = false, disabled = false, children }: {
  onSubmit: (data: FormData) => Promise<string | null>
  onSuccess?: () => void
  submitLabel?: string
  pendingLabel?: string
  destructive?: boolean
  disabled?: boolean
  children?: ReactNode
}) {
  const { pending, start, finish } = useModalState()
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return
    const data = new FormData(event.currentTarget)
    if (!start()) return
    setError(null)
    try {
      const failure = await onSubmit(data)
      if (failure !== null) setError(failure)
      else onSuccess?.()
    } catch {
      setError('Не удалось выполнить действие. Попробуйте ещё раз.')
    } finally {
      finish()
    }
  }

  return (
    <form onSubmit={submit} className="grid min-w-0 gap-4" aria-busy={pending} aria-describedby={error ? errorId : undefined}>
      {children && <fieldset disabled={pending} className="grid min-w-0 gap-4">{children}</fieldset>}
      {error && <p id={errorId} role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <ModalCloseButton>Отмена</ModalCloseButton>
        <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={pending || disabled}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}

export function ConfirmDialog({ onConfirm, onConfirmed, confirmLabel = 'Подтвердить', pendingLabel = 'Выполняем…', destructive = false, ...props }: Omit<ModalProps, 'children' | 'hideTitle'> & {
  onConfirm: () => Promise<string | null>
  onConfirmed?: () => void
  confirmLabel?: string
  pendingLabel?: string
  destructive?: boolean
}) {
  return (
    <Modal {...props}>
      <ModalForm onSubmit={onConfirm} onSuccess={() => { props.onOpenChange(false); onConfirmed?.() }} submitLabel={confirmLabel} pendingLabel={pendingLabel} destructive={destructive} />
    </Modal>
  )
}
