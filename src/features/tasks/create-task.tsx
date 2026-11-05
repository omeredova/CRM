import { useRef, useState } from 'react'

import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { createTask } from './api'
import { TaskForm } from './task-form'

export function CreateTask({ objectId, onCreated }: { objectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)

  return <>
    <Button ref={trigger} type="button" onClick={() => setOpen(true)}>Создать задачу</Button>
    <Modal open={open} onOpenChange={setOpen} finalFocus={trigger} title="Создание задачи"
      description="Задача будет добавлена к текущему объекту со статусом «Новая».">
      <TaskForm objectId={objectId} onSave={createTask} onSaved={() => { setOpen(false); onCreated() }} />
    </Modal>
  </>
}
