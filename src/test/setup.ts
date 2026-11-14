import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { resetSavedProjects } from '../hooks/useSavedProjects'
import { dismissToast } from '../services/toast'

// The saved marks and the toast live in module state: clear them between tests.
afterEach(() => {
  cleanup()
  resetSavedProjects()
  dismissToast()
})

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
