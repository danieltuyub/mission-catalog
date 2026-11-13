import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(cleanup)

// jsdom does not implement scrolling.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo

// Tests start signed out and never touch Supabase Auth; individual tests override the mocks.
const signedOut = vi.hoisted(() => ({ loading: false, email: null, isAdmin: false }))
vi.mock('../services/authService', () => ({
  getAuthSnapshot: vi.fn(() => signedOut),
  subscribeAuth: vi.fn(() => () => {}),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))
