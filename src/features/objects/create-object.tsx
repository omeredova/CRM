import { useRef, useState } from 'react'

import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import { createObject } from './api'
import { ObjectForm } from './object-form'

export function CreateObject({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const pending = useRef(false)
  const trigger = useRef<HTMLButtonElement>(null)

  async function save(name: string, address: string) {
    const error = await createObject(name, address)
    if (!error) {
      setOpen(false)
      onCreated()
    }
    return error
  }

  return <>
    <Button ref={trigger} type="button" onClick={() => setOpen(true)}>Создать объект</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!pending.current) setOpen(next) }}>
      <DialogContent finalFocus={trigger} className="grid gap-4">
        <DialogTitle>Создание объекта</DialogTitle>
        <DialogDescription>Укажите название стройки и адрес. Оба поля обязательны.</DialogDescription>
        <ObjectForm onSave={save} onCancel={() => setOpen(false)} onPendingChange={(value) => { pending.current = value }} submitLabel="Создать объект" />
      </DialogContent>
    </Dialog>
  </>
}
