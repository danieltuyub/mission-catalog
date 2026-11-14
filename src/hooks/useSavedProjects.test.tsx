import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthSnapshot } from '../services/authService'
import { listSavedProjectIds, saveProject, unsaveProject } from '../services/savedProjects'
import { dismissToast, getToast } from '../services/toast'
import { ADMIN, LOADING, SIGNED_OUT, SUBSCRIBER } from '../test/auth'
import { useSavedProjects } from './useSavedProjects'

const list = vi.mocked(listSavedProjectIds)
const save = vi.mocked(saveProject)
const unsave = vi.mocked(unsaveProject)
const auth = (state: typeof SIGNED_OUT) => vi.mocked(getAuthSnapshot).mockReturnValue(state)

/** Renders the hook signed in and waits for the saved ids to load. */
async function signedIn(ids: string[] = []) {
  auth(SUBSCRIBER)
  list.mockResolvedValue(ids)
  const hook = renderHook(() => useSavedProjects())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('useSavedProjects', () => {
  beforeEach(() => {
    list.mockReset().mockResolvedValue([])
    save.mockReset().mockResolvedValue(undefined)
    unsave.mockReset().mockResolvedValue(undefined)
    dismissToast()
    auth(SIGNED_OUT)
  })

  it('marks the projects the user already saved', async () => {
    const { result } = await signedIn(['a', 'b'])
    expect(result.current.isSaved('a')).toBe(true)
    expect(result.current.isSaved('b')).toBe(true)
    expect(result.current.isSaved('c')).toBe(false)
  })

  it('is loading until the saved ids arrive', async () => {
    auth(SUBSCRIBER)
    let resolve!: (ids: string[]) => void
    list.mockReturnValue(new Promise((r) => (resolve = r)))
    const { result } = renderHook(() => useSavedProjects())
    expect(result.current.loading).toBe(true)
    await act(async () => resolve(['a']))
    expect(result.current.loading).toBe(false)
    expect(result.current.isSaved('a')).toBe(true)
  })

  it('is loading while the session resolves, and fetches nothing', () => {
    auth(LOADING)
    const { result } = renderHook(() => useSavedProjects())
    expect(result.current.loading).toBe(true)
    expect(list).not.toHaveBeenCalled()
  })

  it('fetches the ids once per user, however many components use it', async () => {
    auth(SUBSCRIBER)
    const first = renderHook(() => useSavedProjects())
    renderHook(() => useSavedProjects())
    await waitFor(() => expect(first.result.current.loading).toBe(false))
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('asks guests to sign in instead of saving, without loading anything', () => {
    const { result } = renderHook(() => useSavedProjects())
    expect(result.current.loading).toBe(false)
    act(() => result.current.toggle('a'))
    expect(getToast()?.message).toBe('Inicia sesión para guardar proyectos')
    expect(save).not.toHaveBeenCalled()
    expect(list).not.toHaveBeenCalled()
  })

  it('tells a signed-in user without the permission they cannot save', () => {
    auth({ ...SUBSCRIBER, permissions: [] })
    const { result } = renderHook(() => useSavedProjects())
    act(() => result.current.toggle('a'))
    expect(getToast()?.message).toBe('Tu cuenta no tiene permiso para guardar proyectos')
    expect(save).not.toHaveBeenCalled()
    expect(list).not.toHaveBeenCalled()
  })

  it('lets admins save (they hold every permission)', async () => {
    auth(ADMIN)
    const { result } = renderHook(() => useSavedProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => result.current.toggle('a'))
    expect(save).toHaveBeenCalledWith('a')
  })

  it('saves: the heart flips at once and a toast confirms', async () => {
    const { result } = await signedIn()
    let release!: () => void
    save.mockReturnValue(new Promise<void>((r) => (release = r)))
    act(() => result.current.toggle('a'))
    expect(result.current.isSaved('a')).toBe(true)
    expect(getToast()).toBeNull()
    await act(async () => release())
    expect(save).toHaveBeenCalledWith('a')
    expect(getToast()).toMatchObject({ message: 'Proyecto guardado' })
    expect(getToast()?.action).toBeUndefined()
  })

  it('unsaves with a toast that can undo it', async () => {
    const { result } = await signedIn(['a'])
    await act(async () => result.current.toggle('a'))
    expect(unsave).toHaveBeenCalledWith('a')
    expect(result.current.isSaved('a')).toBe(false)
    expect(getToast()).toMatchObject({ message: 'Proyecto quitado de guardados', action: { label: 'Deshacer' } })

    await act(async () => getToast()?.action?.onClick())
    expect(save).toHaveBeenCalledWith('a')
    expect(result.current.isSaved('a')).toBe(true)
    expect(getToast()?.message).toBe('Proyecto guardado')
  })

  it('goes back and says so when saving fails', async () => {
    const { result } = await signedIn()
    save.mockRejectedValue(new Error('boom'))
    await act(async () => result.current.toggle('a'))
    expect(result.current.isSaved('a')).toBe(false)
    expect(getToast()?.message).toBe('No se pudo guardar el proyecto')
  })

  it('goes back and says so when unsaving fails', async () => {
    const { result } = await signedIn(['a'])
    unsave.mockRejectedValue(new Error('boom'))
    await act(async () => result.current.toggle('a'))
    expect(result.current.isSaved('a')).toBe(true)
    expect(getToast()?.message).toBe('No se pudo quitar el proyecto de guardados')
  })

  it('ignores taps on a project while its request is in flight', async () => {
    const { result } = await signedIn()
    let release!: () => void
    save.mockReturnValue(new Promise<void>((r) => (release = r)))
    act(() => result.current.toggle('a'))
    act(() => result.current.toggle('a'))
    await act(async () => release())
    expect(save).toHaveBeenCalledTimes(1)
    expect(unsave).not.toHaveBeenCalled()
  })

  it('stays usable, without marks, when the saved ids cannot be loaded', async () => {
    auth(SUBSCRIBER)
    list.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useSavedProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getToast()?.message).toBe('No se pudieron cargar tus proyectos guardados')
    await act(async () => result.current.toggle('a'))
    expect(result.current.isSaved('a')).toBe(true)
  })

  it('forgets the marks on sign out and does not leak them to another user', async () => {
    const { result, rerender } = await signedIn(['a'])
    auth(SIGNED_OUT)
    rerender()
    expect(result.current.isSaved('a')).toBe(false)

    auth({ ...SUBSCRIBER, userId: 'sub-2' })
    list.mockResolvedValue([])
    rerender()
    expect(result.current.isSaved('a')).toBe(false)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(list).toHaveBeenCalledTimes(2)
  })
})
