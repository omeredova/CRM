import { useId, useRef, useState, type FormEvent } from 'react'

import { supabase } from '@/shared/api/supabase'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { updateUserName, type Profile } from './profile'

function NameForm({ profile, onSaved, onPending }: {
  profile: Profile
  onSaved: (profile: Profile) => void
  onPending: (pending: boolean) => void
}) {
  const id = useId()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const data = new FormData(event.currentTarget)
    const first = data.get('firstName')
    const last = data.get('lastName')
    if (typeof first !== 'string' || typeof last !== 'string') return
    submitting.current = true
    setPending(true)
    onPending(true)
    setError(null)
    try {
      const result = await updateUserName(supabase, profile.id, first, last)
      if (result.error !== null) setError(result.error)
      else onSaved(result.profile)
    } finally {
      submitting.current = false
      setPending(false)
      onPending(false)
    }
  }

  return <form onSubmit={submit} className="grid gap-4" aria-busy={pending}>
    <div className="grid gap-2">
      <Label htmlFor={`${id}-first`}>Имя</Label>
      <Input id={`${id}-first`} name="firstName" autoComplete="given-name" defaultValue={profile.first_name} required maxLength={100} disabled={pending} aria-describedby={error ? `${id}-error` : undefined} />
    </div>
    <div className="grid gap-2">
      <Label htmlFor={`${id}-last`}>Фамилия</Label>
      <Input id={`${id}-last`} name="lastName" autoComplete="family-name" defaultValue={profile.last_name} required maxLength={100} disabled={pending} aria-describedby={error ? `${id}-error` : undefined} />
    </div>
    {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2">
      <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Отмена</DialogClose>
      <Button type="submit" disabled={pending}>{pending ? 'Сохраняем…' : 'Сохранить'}</Button>
    </div>
  </form>
}


export function EditProfileName({ profile, email, onSaved }: {
  profile: Profile
  email: string | undefined
  onSaved: (profile: Profile) => void
}) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const pending = useRef(false)
  const trigger = useRef<HTMLButtonElement>(null)

  return <>
    <Button ref={trigger} type="button" variant="ghost" onClick={() => { setMessage(''); setOpen(true) }}>
      {profile.name_set_at === null ? 'Указать имя и фамилию' : 'Изменить имя и фамилию'}
    </Button>
    <span role="status" className="sr-only">{message}</span>
    <Dialog open={open} onOpenChange={(next) => { if (!pending.current) setOpen(next) }}>
      <DialogContent finalFocus={trigger} className="grid gap-4">
        <DialogTitle>Мои имя и фамилия</DialogTitle>
        <DialogDescription>Укажите, как вас будут видеть коллеги. Свои данные можно изменить в любое время.</DialogDescription>
        {email && <p className="break-words text-sm text-muted-foreground">{email}</p>}
        {open && <NameForm profile={profile} onPending={(value) => { pending.current = value }} onSaved={(updated) => {
          setOpen(false)
          setMessage('Имя и фамилия сохранены.')
          onSaved(updated)
        }} />}
      </DialogContent>
    </Dialog>
  </>
}
