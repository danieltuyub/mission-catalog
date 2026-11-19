import type { AccountSection } from '../../hooks/useRoute'
import type { AuthState } from '../../services/authService'
import { can } from '../../services/permissions'

export interface SectionInfo {
  id: AccountSection
  /** Name in the `account` translations: `sections.<id>`. */
  allowed: (auth: AuthState) => boolean
}

/** In the order of the chips. A section nobody may use is simply not listed. */
export const SECTIONS: readonly SectionInfo[] = [
  { id: 'mensajes', allowed: (a) => can(a, 'messages.send') },
  { id: 'solicitudes', allowed: (a) => can(a, 'pins.request') },
  { id: 'proyectos', allowed: (a) => can(a, 'projects.save') || can(a, 'projects.create') },
  { id: 'perfil', allowed: () => true },
]

export const sectionsFor = (auth: AuthState) => SECTIONS.filter((s) => s.allowed(auth))
