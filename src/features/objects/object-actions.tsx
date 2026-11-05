import { useRef, useState, type FormEvent } from 'react'
import { Ellipsis } from 'lucide-react'

import type { CrmRole } from '@/features/auth/profile'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'
import { deleteObject, updateObject, type ConstructionObject } from './api'
import { ObjectForm } from './object-form'

type Action = 'view' | 'edit' | 'delete'

export function ObjectActions({ object, role, onChanged }: {
  object: ConstructionObject
  role: CrmRole
  onChanged: (message: string) => void
}) {
  const [action, setAction] = useState<Action | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)
  const trigger = useRef<HTMLButtonElement>(null)

  function open(next: Action) {
    setError(null)
    setAction(next)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || role !== 'manager' || action !== 'delete') return
    submitting.current = true
    setPending(true)
    setError(null)
    try {
      const failure = await deleteObject(object.id)
      if (failure) {
        setError(failure)
        return
      }
      setAction(null)
      onChanged('Объект удалён.')
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  async function save(name: string, address: string) {
    if (role !== 'manager') return 'Недостаточно прав для редактирования объекта.'
    const failure = await updateObject(object.id, name, address)
    if (!failure) {
      setAction(null)
      onChanged('Объект сохранён.')
    }
    return failure
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button ref={trigger} type="button" variant="ghost" size="icon" />} aria-label={`Действия: ${object.name}`}>
          <Ellipsis aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => open('view')}>Посмотреть</DropdownMenuItem>
          {role === 'manager' && <>
            <DropdownMenuItem onClick={() => open('edit')}>Редактировать</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => open('delete')}>Удалить</DropdownMenuItem>
          </>}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={action !== null} onOpenChange={(isOpen) => { if (!isOpen && !submitting.current) setAction(null) }}>
        <DialogContent finalFocus={trigger} className="grid gap-4">
          <DialogTitle className={action === 'view' ? 'sr-only' : undefined}>{action === 'edit' ? 'Редактирование объекта' : action === 'delete' ? 'Удалить объект?' : object.name}</DialogTitle>
          {action !== 'view' && <DialogDescription>
            {action === 'delete'
              ? `Объект «${object.name}» будет удалён без возможности восстановления. Объект со связанными задачами удалить нельзя.`
              : 'Название и адрес обязательны.'}
          </DialogDescription>}
          {action === 'view' ? <>
            <dl className="grid gap-4 text-sm">
              <div><dt className="text-muted-foreground">Название</dt><dd className="whitespace-pre-wrap break-words">{object.name}</dd></div>
              <div><dt className="text-muted-foreground">Адрес</dt><dd className="whitespace-pre-wrap break-words">{object.address}</dd></div>
            </dl>
            <DialogClose render={<Button type="button" variant="outline" />}>Закрыть</DialogClose>
          </> : action === 'edit' ? (
            <ObjectForm object={object} onSave={save} onCancel={() => setAction(null)} onPendingChange={(value) => { submitting.current = value }} submitLabel="Сохранить" />
          ) : (
            <form onSubmit={submit} className="grid gap-4" aria-busy={pending}>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Отмена</DialogClose>
                <Button type="submit" variant="destructive" disabled={pending}>
                  {pending ? 'Удаляем…' : 'Удалить'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
