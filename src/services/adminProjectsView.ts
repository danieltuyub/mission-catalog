export type AdminProjectSortKey = 'name' | 'place' | 'creator' | 'updated'
export interface AdminProjectSort {
  key: AdminProjectSortKey
  descending: boolean
}

export const ADMIN_PAGE_SIZES = [10, 25, 50] as const
export const DEFAULT_ADMIN_SORT: AdminProjectSort = { key: 'name', descending: false }

// In-memory on purpose, like the public list: survives menu navigation, resets on reload.
let sort: AdminProjectSort = DEFAULT_ADMIN_SORT
let pageSize: number = ADMIN_PAGE_SIZES[0]

export const loadAdminSort = () => sort
export const saveAdminSort = (value: AdminProjectSort) => {
  sort = value
}
export const loadAdminPageSize = () => pageSize
export const saveAdminPageSize = (value: number) => {
  pageSize = (ADMIN_PAGE_SIZES as readonly number[]).includes(value) ? value : ADMIN_PAGE_SIZES[0]
}
