import { createContext, useContext } from 'react'

type ModalState = {
  pending: boolean
  start: () => boolean
  finish: () => void
}

export const ModalContext = createContext<ModalState | null>(null)

export function useModalState() {
  const state = useContext(ModalContext)
  if (!state) throw new Error('Modal controls must be rendered inside Modal.')
  return state
}
