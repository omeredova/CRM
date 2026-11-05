import { useId, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'

import { supabase } from '@/shared/api/supabase'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Modal, ModalForm } from '@/shared/ui/modal'
import { updateUserName, type Profile } from './profile'

function NameForm({ profile, onSaved }: {
  profile: Profile
  onSaved: (profile: Profile) => void
}) {
  const id = useId()

  async function submit(data: FormData) {
    const first = data.get('firstName')
    const last = data.get('lastName')
    if (typeof first !== 'string' || typeof last !== 'string') return 'Введите имя и фамилию.'
    const result = await updateUserName(supabase, profile.id, first, last)
    if (result.error !== null) return result.error
    onSaved(result.profile)
    return null
  }

  return <ModalForm onSubmit={submit}>
    <div className="grid gap-2">
      <Label htmlFor={`${id}-first`}>Имя</Label>
      <Input id={`${id}-first`} name="firstName" autoComplete="given-name" defaultValue={profile.first_name} required maxLength={100} />
    </div>
    <div className="grid gap-2">
      <Label htmlFor={`${id}-last`}>Фамилия</Label>
      <Input id={`${id}-last`} name="lastName" autoComplete="family-name" defaultValue={profile.last_name} required maxLength={100} />
    </div>
  </ModalForm>
}

export function EditProfileName({ profile, email, onSaved }: {
  profile: Profile
  email: string | undefined
  onSaved: (profile: Profile) => void
}) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)

  return <>
    <Button ref={trigger} type="button" variant="ghost" size="icon" aria-label="Изменить имя и фамилию" title="Изменить имя и фамилию" onClick={() => { setMessage(''); setOpen(true) }}>
      <Pencil aria-hidden="true" />
    </Button>
    <span role="status" className="sr-only">{message}</span>
    <Modal open={open} onOpenChange={setOpen} finalFocus={trigger} title="Мои имя и фамилия"
      description="Укажите, как вас будут видеть коллеги. Свои данные можно изменить в любое время.">
      {email && <p className="break-words text-sm text-muted-foreground">{email}</p>}
      <NameForm profile={profile} onSaved={(updated) => {
        setOpen(false)
        setMessage('Имя и фамилия сохранены.')
        onSaved(updated)
      }} />
    </Modal>
  </>
}
