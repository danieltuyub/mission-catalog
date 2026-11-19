import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { setLanguage } from '../i18n'
import { resetSavedProjects } from '../hooks/useSavedProjects'
import { dismissToast } from '../services/toast'

// Tests run in Spanish, whatever the browser says; a test that changes it must not leak.
beforeEach(async () => {
  await setLanguage('es')
})

// The saved marks and the toast live in module state: clear them between tests.
afterEach(() => {
  cleanup()
  resetSavedProjects()
  dismissToast()
})

// No unread messages and no live connection by default.
vi.mock('../services/unreadMessages', () => ({
  countUnreadMessages: vi.fn(async () => 0),
  subscribeToMessages: vi.fn(() => () => {}),
}))

// No unread contact messages and no live connection by default; the rest of the service is real.
vi.mock('../services/contactMessages', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/contactMessages')>()),
  countUnreadContacts: vi.fn(async () => 0),
  subscribeToContacts: vi.fn(() => () => {}),
}))

// Nothing saved by default and every request succeeds; individual tests override the mocks.
vi.mock('../services/savedProjects', () => ({
  listSavedProjectIds: vi.fn(async () => []),
  saveProject: vi.fn(async () => {}),
  unsaveProject: vi.fn(async () => {}),
}))

// jsdom does not implement scrolling.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo

// Tests start signed out and never touch Supabase Auth; individual tests override the mocks.
vi.mock('../services/authService', async () => {
  const { SIGNED_OUT } = await import('./auth')
  return {
    getAuthSnapshot: vi.fn(() => SIGNED_OUT),
    subscribeAuth: vi.fn(() => () => {}),
    setProfileNames: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }
})
