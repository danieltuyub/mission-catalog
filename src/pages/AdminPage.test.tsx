import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const svc = vi.hoisted(() => ({ countPendingRequests: vi.fn() }))
vi.mock('../services/pinRequests', () => ({
  countPendingRequests: svc.countPendingRequests,
  listRequestsPage: vi.fn().mockResolvedValue({ requests: [], total: 0 }),
  countReviewedRequests: vi.fn().mockResolvedValue(0),
  REVIEW_PAGE_SIZE: 10,
}))

import { countUnreadContacts } from '../services/contactMessages'
import { getAuthSnapshot } from '../services/authService'
import { ADMIN, SIGNED_OUT } from '../test/auth'
import AdminPage from './AdminPage'

beforeEach(() => {
  vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
  svc.countPendingRequests.mockReset().mockResolvedValue(0)
})
afterEach(() => {
  vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
  window.location.hash = ''
})

describe('AdminPage', () => {
  it('goes to the first section from #/admin and from an unknown one', () => {
    window.location.hash = '#/admin'
    const { unmount } = render(<AdminPage />)
    expect(window.location.hash).toBe('#/admin/solicitudes')
    unmount()
    window.location.hash = '#/admin/nada'
    render(<AdminPage />)
    expect(window.location.hash).toBe('#/admin/solicitudes')
  })

  it('lists the seven sections and marks the current one', () => {
    window.location.hash = '#/admin/usuarios'
    render(<AdminPage />)
    const nav = screen.getByRole('navigation', { name: 'Administración' })
    expect(nav.querySelectorAll('a')).toHaveLength(7)
    expect(screen.getByRole('link', { name: 'Usuarios' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Mensajes' })).toHaveAttribute('href', '#/admin/mensajes')
  })

  it('badges the unread contact messages on their tab', async () => {
    vi.mocked(countUnreadContacts).mockResolvedValue(4)
    window.location.hash = '#/admin/usuarios'
    render(<AdminPage />)
    expect(await screen.findByLabelText('4 mensajes de contacto sin leer')).toBeInTheDocument()
  })

  it('badges the pending requests', async () => {
    svc.countPendingRequests.mockResolvedValue(3)
    window.location.hash = '#/admin/solicitudes'
    render(<AdminPage />)
    expect(await screen.findByLabelText('3 pendientes')).toBeInTheDocument()
  })
})
