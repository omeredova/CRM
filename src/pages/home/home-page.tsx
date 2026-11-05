import type { CrmRole } from '@/features/auth/profile'
import { ObjectsList } from '@/features/objects/objects-list'

export function HomePage({ role }: { role: CrmRole }) {
  return <ObjectsList role={role} />
}
