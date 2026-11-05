import { getObjects, OBJECTS_PAGE_SIZE, type ConstructionObject } from '@/features/objects/api'

export async function getTaskObjectOptions(signal: AbortSignal) {
  const objects: ConstructionObject[] = []
  for (let page = 1; ; page++) {
    const result = await getObjects(page, signal)
    if (result.status === 'error') return result
    objects.push(...result.objects)
    if (page * OBJECTS_PAGE_SIZE >= result.count) return { status: 'success' as const, objects }
    if (signal.aborted) return { status: 'error' as const, error: 'Загрузка объектов отменена.' }
  }
}
