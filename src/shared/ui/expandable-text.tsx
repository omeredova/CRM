import { useId, useState } from 'react'

import { Button } from './button'

export function ExpandableText({ text, label, previewLength = 300 }: {
  text: string
  label: string
  previewLength?: number
}) {
  const id = useId()
  const [expanded, setExpanded] = useState(false)
  const lines = text.split('\n')
  const canExpand = text.length > previewLength || lines.length > 3
  const preview = lines.slice(0, 3).join('\n').slice(0, previewLength).trimEnd()

  return (
    <span className="block min-w-0">
      <span id={id} className={`whitespace-pre-wrap [overflow-wrap:anywhere] ${canExpand && !expanded ? 'line-clamp-3' : 'block'}`}>
        {canExpand && !expanded ? `${preview}…` : text}
      </span>
      {canExpand && <Button type="button" variant="link" size="sm"
        className="h-auto max-w-full whitespace-normal px-0 py-1 text-left"
        aria-expanded={expanded} aria-controls={id}
        aria-label={`${expanded ? 'Свернуть' : 'Показать полностью'}: ${label}`}
        onClick={() => setExpanded((value) => !value)}>
        {expanded ? 'Свернуть' : 'Показать полностью'}
      </Button>}
    </span>
  )
}
