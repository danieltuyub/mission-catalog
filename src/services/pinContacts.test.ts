import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('./supabaseClient', () => ({ supabase: { rpc } }))

import { getPinContactState } from './pinContacts'

beforeEach(() => rpc.mockReset())

describe('getPinContactState', () => {
  it('asks the database, which never says who the contact is', async () => {
    rpc.mockResolvedValue({ data: 'other', error: null })
    await expect(getPinContactState('p1')).resolves.toBe('other')
    expect(rpc).toHaveBeenCalledWith('pin_contact_state', { p_pin: 'p1' })
  })

  it('treats anything unexpected as no contact', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await expect(getPinContactState('p1')).resolves.toBe('none')
  })

  it('fails with a message ready to show', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'x' } })
    await expect(getPinContactState('p1')).rejects.toThrow('No se pudo consultar el contacto')
  })
})
