import { useId } from 'react'

import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { ModalForm } from '@/shared/ui/modal'
import type { ConstructionObject } from './api'

export function ObjectForm({ object, onSave, onSaved, submitLabel }: {
  object?: ConstructionObject
  onSave: (name: string, address: string) => Promise<string | null>
  onSaved: () => void
  submitLabel: string
}) {
  const id = useId()

  async function submit(data: FormData) {
    const name = data.get('name')
    const address = data.get('address')
    if (typeof name !== 'string' || typeof address !== 'string' || !name.trim() || !address.trim() || name.trim().length > 300 || address.trim().length > 1000) {
      return 'Укажите название до 300 символов и адрес до 1000 символов. Поля не могут быть пустыми.'
    }
    return onSave(name.trim(), address.trim())
  }

  return (
    <ModalForm onSubmit={submit} onSuccess={onSaved} submitLabel={submitLabel}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-name`}>Название</Label>
        <Input id={`${id}-name`} name="name" defaultValue={object?.name ?? ''} required maxLength={300} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-address`}>Адрес</Label>
        <Input id={`${id}-address`} name="address" defaultValue={object?.address ?? ''} required maxLength={1000} />
      </div>
    </ModalForm>
  )
}
