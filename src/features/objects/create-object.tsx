import { useRef, useState } from 'react'

import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { createObject } from './api'
import { ObjectForm } from './object-form'

export function CreateObject({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)

  return <>
    <Button ref={trigger} type="button" onClick={() => setOpen(true)}>Создать объект</Button>
    <Modal open={open} onOpenChange={setOpen} finalFocus={trigger} title="Создание объекта" description="Укажите название стройки и адрес. Оба поля обязательны.">
      <ObjectForm onSave={createObject} onSaved={() => { setOpen(false); onCreated() }} submitLabel="Создать объект" />
    </Modal>
  </>
}
