import type { AccountSection } from '../../hooks/useRoute'
import type { AuthState } from '../../services/authService'
import { can } from '../../services/permissions'

export interface SectionInfo {
  id: AccountSection
  label: string
  allowed: (auth: AuthState) => boolean
}

/** In the order of the chips. A section nobody may use is simply not listed. */
export const SECTIONS: readonly SectionInfo[] = [
  { id: 'mensajes', label: 'Mensajes', allowed: (a) => can(a, 'messages.send') },
  { id: 'solicitudes', label: 'Solicitudes de pines', allowed: (a) => can(a, 'pins.request') },
  { id: 'proyectos', label: 'Proyectos', allowed: (a) => can(a, 'projects.save') || can(a, 'projects.create') },
  { id: 'perfil', label: 'Mi cuenta', allowed: () => true },
]

export const sectionsFor = (auth: AuthState) => SECTIONS.filter((s) => s.allowed(auth))
