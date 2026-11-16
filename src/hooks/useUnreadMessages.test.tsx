import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthSnapshot } from '../services/authService'
import { countUnreadMessages, subscribeToMessages } from '../services/unreadMessages'
import { ADMIN, LOADING, SIGNED_OUT, SUBSCRIBER } from '../test/auth'
import { useUnreadMessages } from './useUnreadMessages'

const count = vi.mocked(countUnreadMessages)
const subscribe = vi.mocked(subscribeToMessages)
const auth = (state: typeof SIGNED_OUT) => vi.mocked(getAuthSnapshot).mockReturnValue(state)

describe('useUnreadMessages', () => {
  beforeEach(() => {
    count.mockReset().mockResolvedValue(0)
    subscribe.mockReset().mockReturnValue(() => {})
    auth(SIGNED_OUT)
  })

  it('counts the unread messages of the signed-in user', async () => {
    auth(SUBSCRIBER)
    count.mockResolvedValue(4)
    const { result } = renderHook(() => useUnreadMessages())
    expect(result.current).toBe(0)
    await waitFor(() => expect(result.current).toBe(4))
    expect(count).toHaveBeenCalledWith('sub-1')
    expect(subscribe).toHaveBeenCalledWith('sub-1', expect.any(Function))
  })

  it('works for admins', async () => {
    auth(ADMIN)
    count.mockResolvedValue(2)
    const { result } = renderHook(() => useUnreadMessages())
    await waitFor(() => expect(result.current).toBe(2))
  })

  it.each([
    ['guests', SIGNED_OUT],
    ['a session still loading', LOADING],
    ['users who cannot message', { ...SUBSCRIBER, permissions: [] }],
  ])('does not ask or listen for %s', (_, state) => {
    auth(state)
    const { result } = renderHook(() => useUnreadMessages())
    expect(result.current).toBe(0)
    expect(count).not.toHaveBeenCalled()
    expect(subscribe).not.toHaveBeenCalled()
  })

  it('recounts when a message arrives or changes', async () => {
    auth(SUBSCRIBER)
    count.mockResolvedValueOnce(1).mockResolvedValue(2)
    const { result } = renderHook(() => useUnreadMessages())
    await waitFor(() => expect(result.current).toBe(1))
    act(() => subscribe.mock.calls[0][1]())
    await waitFor(() => expect(result.current).toBe(2))
  })

  it('recounts when the window comes back into focus', async () => {
    auth(SUBSCRIBER)
    count.mockResolvedValueOnce(0).mockResolvedValue(5)
    const { result } = renderHook(() => useUnreadMessages())
    await waitFor(() => expect(count).toHaveBeenCalledTimes(1))
    act(() => void window.dispatchEvent(new Event('focus')))
    await waitFor(() => expect(result.current).toBe(5))
  })

  it('keeps the latest answer when responses arrive out of order', async () => {
    auth(SUBSCRIBER)
    let first!: (n: number) => void
    count.mockReturnValueOnce(new Promise((r) => (first = r))).mockResolvedValue(7)
    const { result } = renderHook(() => useUnreadMessages())
    act(() => subscribe.mock.calls[0][1]())
    await waitFor(() => expect(result.current).toBe(7))
    await act(async () => first(1)) // the old, slower answer must not win
    expect(result.current).toBe(7)
  })

  it('keeps the number when counting fails', async () => {
    auth(SUBSCRIBER)
    count.mockResolvedValueOnce(3).mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useUnreadMessages())
    await waitFor(() => expect(result.current).toBe(3))
    act(() => subscribe.mock.calls[0][1]())
    await act(async () => {})
    expect(result.current).toBe(3)
  })

  it('stops listening and shows nothing after signing out', async () => {
    const stop = vi.fn()
    subscribe.mockReturnValue(stop)
    auth(SUBSCRIBER)
    count.mockResolvedValue(3)
    const { result, rerender } = renderHook(() => useUnreadMessages())
    await waitFor(() => expect(result.current).toBe(3))
    auth(SIGNED_OUT)
    rerender()
    expect(stop).toHaveBeenCalled()
    expect(result.current).toBe(0)
  })

  it('never shows one user\'s count to the next', async () => {
    auth(SUBSCRIBER)
    count.mockResolvedValue(3)
    const { result, rerender } = renderHook(() => useUnreadMessages())
    await waitFor(() => expect(result.current).toBe(3))
    auth({ ...SUBSCRIBER, userId: 'sub-2' })
    count.mockReturnValue(new Promise(() => {}))
    rerender()
    expect(result.current).toBe(0)
  })
})
