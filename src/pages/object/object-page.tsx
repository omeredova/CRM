import { Link, useParams } from 'react-router'

import { useObjectDetails } from '@/features/objects/use-object-details'
import { Button } from '@/shared/ui/button'

function ObjectDetails({ id }: { id: string }) {
  const { state, retry } = useObjectDetails(id)

  return (
    <div className="grid min-w-0 gap-6">
      <Link to="/" className="w-fit rounded-md text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">← К объектам</Link>
      {state.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Загружаем объект…</p>}
      {state.status === 'error' && <div className="grid justify-items-start gap-4">
        <h1 className="text-xl font-semibold">Не удалось открыть объект</h1>
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
        <Button type="button" variant="outline" onClick={retry}>Повторить</Button>
      </div>}
      {state.status === 'not-found' && <div className="grid gap-2">
        <h1 className="text-xl font-semibold">Объект не найден или недоступен</h1>
        <p className="text-sm text-muted-foreground">Объект мог быть удалён, либо у вас нет доступа к нему.</p>
      </div>}
      {state.status === 'success' && <header className="grid min-w-0 gap-2">
        <h1 className="break-words text-xl font-semibold">{state.object.name}</h1>
        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground"><span className="font-medium">Адрес: </span>{state.object.address}</p>
      </header>}
    </div>
  )
}

export function ObjectPage() {
  const { id = '' } = useParams<'id'>()
  return <ObjectDetails key={id} id={id} />
}
