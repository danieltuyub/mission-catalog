import i18n from '../i18n'
import { useEffect, useSyncExternalStore } from 'react'
import { loginToastAction } from '../services/authRedirect'
import { can } from '../services/permissions'
import { listSavedProjectIds, saveProject, unsaveProject } from '../services/savedProjects'
import { showToast } from '../services/toast'
import { useAuth } from './useAuth'

// The saved ids live outside React so the list and the detail share them without refetching.
interface Store {
  userId: string | null
  ids: ReadonlySet<string>
  /** False until the user's saved ids have been fetched. */
  ready: boolean
}

const EMPTY: ReadonlySet<string> = new Set()
const INITIAL: Store = { userId: null, ids: EMPTY, ready: false }

let store: Store = INITIAL
const listeners = new Set<() => void>()
// Projects with a request in flight: further taps on them are ignored until it settles.
const pending = new Set<string>()

function setStore(next: Store) {
  store = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => store

const withProject = (ids: ReadonlySet<string>, projectId: string, saved: boolean) => {
  const next = new Set(ids)
  if (saved) next.add(projectId)
  else next.delete(projectId)
  return next
}

/** Forgets everything (signed out, or between tests). */
export function resetSavedProjects() {
  pending.clear()
  if (store !== INITIAL) setStore(INITIAL)
}

function ensureLoaded(userId: string) {
  if (store.userId === userId) return
  pending.clear()
  setStore({ userId, ids: EMPTY, ready: false })
  listSavedProjectIds().then(
    (ids) => {
      if (store.userId === userId) setStore({ userId, ids: new Set(ids), ready: true })
    },
    () => {
      if (store.userId !== userId) return
      // Usable without the saved marks rather than stuck: saving still works.
      setStore({ userId, ids: EMPTY, ready: true })
      showToast(i18n.t('saved.loadFailed'))
    },
  )
}

async function toggleSaved(projectId: string) {
  const { userId, ids, ready } = store
  if (!userId || !ready || pending.has(projectId)) return
  const wasSaved = ids.has(projectId)
  pending.add(projectId)
  // Optimistic: the heart flips at once and goes back if the request fails.
  setStore({ ...store, ids: withProject(ids, projectId, !wasSaved) })
  try {
    await (wasSaved ? unsaveProject(projectId) : saveProject(projectId))
    if (wasSaved) {
      showToast(i18n.t('saved.removed'), {
        label: i18n.t('saved.undo'),
        onClick: () => {
          if (store.userId === userId) void toggleSaved(projectId)
        },
      })
    } else {
      showToast(i18n.t('saved.saved'))
    }
  } catch {
    if (store.userId === userId) setStore({ ...store, ids: withProject(store.ids, projectId, wasSaved) })
    showToast(wasSaved ? i18n.t('saved.removeFailed') : i18n.t('saved.saveFailed'))
  } finally {
    pending.delete(projectId)
  }
}

/** Saved-project marks and the toggle for the signed-in user. Guests get a toast instead of saving. */
export function useSavedProjects() {
  const auth = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot)
  const canSave = can(auth, 'projects.save')

  useEffect(() => {
    if (auth.loading) return
    if (auth.userId && canSave) ensureLoaded(auth.userId)
    else resetSavedProjects()
  }, [auth.loading, auth.userId, canSave])

  // Ignore what the store holds for another user (e.g. just after switching accounts).
  const mine = auth.userId && snapshot.userId === auth.userId ? snapshot : null

  return {
    /** True while the session or the saved ids are still being resolved: taps would be ambiguous. */
    loading: auth.loading || (!!auth.userId && canSave && !mine?.ready),
    isSaved: (projectId: string) => !!mine?.ids.has(projectId),
    toggle: (projectId: string) => {
      if (!auth.userId) showToast(i18n.t('saved.signIn'), loginToastAction())
      else if (!canSave) showToast(i18n.t('saved.noPermission'))
      else void toggleSaved(projectId)
    },
  }
}
