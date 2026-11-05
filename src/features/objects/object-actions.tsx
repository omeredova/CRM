import { useRef, useState } from 'react'
import { Ellipsis } from 'lucide-react'

import type { CrmRole } from '@/features/auth/profile'
import { Button } from '@/shared/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'
import { ConfirmDialog, Modal, ModalCloseButton } from '@/shared/ui/modal'
import { deleteObject, updateObject, type ConstructionObject } from './api'
import { ObjectForm } from './object-form'

type Action = 'view' | 'edit' | 'delete'

export function ObjectActions({ object, role, onChanged }: {
  object: ConstructionObject
  role: CrmRole
  onChanged: (message: string) => void
}) {
  const [action, setAction] = useState<Action | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  async function save(name: string, address: string) {
    if (role !== 'manager') return 'Недостаточно прав для редактирования объекта.'
    return updateObject(object.id, name, address)
  }

  async function remove() {
    if (role !== 'manager') return 'Недостаточно прав для удаления объекта.'
    return deleteObject(object.id)
  }

  function close(open: boolean) {
    if (!open) setAction(null)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button ref={trigger} type="button" variant="ghost" size="icon" />} aria-label={`Действия: ${object.name}`}>
          <Ellipsis aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setAction('view')}>Посмотреть</DropdownMenuItem>
          {role === 'manager' && <>
            <DropdownMenuItem onClick={() => setAction('edit')}>Редактировать</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setAction('delete')}>Удалить</DropdownMenuItem>
          </>}
        </DropdownMenuContent>
      </DropdownMenu>
      <Modal open={action === 'view' || action === 'edit'} onOpenChange={close} finalFocus={trigger}
        title={action === 'edit' ? 'Редактирование объекта' : object.name}
        hideTitle={action !== 'edit'} description={action === 'edit' ? 'Название и адрес обязательны.' : undefined}>
        {action === 'edit' ? (
          <ObjectForm object={object} onSave={save} onSaved={() => { setAction(null); onChanged('Объект сохранён.') }} submitLabel="Сохранить" />
        ) : <>
          <dl className="grid gap-4 text-sm">
            <div><dt className="text-muted-foreground">Название</dt><dd className="whitespace-pre-wrap break-words">{object.name}</dd></div>
            <div><dt className="text-muted-foreground">Адрес</dt><dd className="whitespace-pre-wrap break-words">{object.address}</dd></div>
          </dl>
          <ModalCloseButton />
        </>}
      </Modal>
      <ConfirmDialog open={action === 'delete'} onOpenChange={close} finalFocus={trigger} title="Удалить объект?"
        description={`Объект «${object.name}» будет удалён без возможности восстановления. Объект со связанными задачами удалить нельзя.`}
        onConfirm={remove} onConfirmed={() => onChanged('Объект удалён.')} confirmLabel="Удалить" pendingLabel="Удаляем…" destructive />
    </>
  )
}
