import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(cleanup)

// jsdom does not implement scrolling.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo

// Tests start signed out and never touch Supabase Auth; individual tests override the mocks.
vi.mock('../services/authService', async () => {
  const { SIGNED_OUT } = await import('./auth')
  return {
    getAuthSnapshot: vi.fn(() => SIGNED_OUT),
    subscribeAuth: vi.fn(() => () => {}),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }
})
