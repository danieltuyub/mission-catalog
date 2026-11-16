import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const svc = vi.hoisted(() => ({
  listConversations: vi.fn(),
  listThread: vi.fn(),
  sendReply: vi.fn(),
  markConversationRead: vi.fn(),
}))
vi.mock('../../services/messages', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/messages')>()),
  ...svc,
}))

import { getAuthSnapshot } from '../../services/authService'
import { SIGNED_OUT, SUBSCRIBER } from '../../test/auth'
import MessagesSection from './MessagesSection'

const conversation = (over: object = {}) => ({
  id: 'c1',
  otherId: 'creator-1',
  projectId: 'p1',
  projectName: 'Casa Azul',
  otherName: 'Ana Pérez',
  lastMessage: { body: 'Claro, escríbeme', fromMe: false, createdAt: '2026-11-10T12:00:00Z' },
  lastMessageAt: '2026-11-10T12:00:00Z',
  unread: 0,
  ...over,
})

const message = (over: object) => ({
  id: 'm1',
  conversation_id: 'c1',
  sender_id: 'sub-1',
  recipient_id: 'creator-1',
  project_id: 'p1',
  sender_name: 'Yo',
  body: 'Hola',
  created_at: '2026-11-10T11:00:00Z',
  read_at: null,
  ...over,
})

beforeEach(() => {
  vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
  Object.values(svc).forEach((f) => f.mockReset())
  svc.listConversations.mockResolvedValue([])
  svc.listThread.mockResolvedValue([])
  svc.markConversationRead.mockResolvedValue(undefined)
  window.location.hash = '#/cuenta/mensajes'
})
afterEach(() => {
  vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
  window.location.hash = ''
})

describe('MessagesSection', () => {
  it('points to the projects when there are no conversations', async () => {
    render(<MessagesSection />)
    expect(await screen.findByText('Aún no tienes conversaciones.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver proyectos' })).toHaveAttribute('href', '#/proyectos')
    expect(svc.listConversations).toHaveBeenCalledWith('sub-1')
  })

  it('lists the conversations with preview, name and unread count', async () => {
    svc.listConversations.mockResolvedValue([
      conversation({ unread: 2 }),
      conversation({ id: 'c2', projectId: null, projectName: null, otherName: '', lastMessage: { body: 'Gracias', fromMe: true, createdAt: '2026-11-09T12:00:00Z' } }),
    ])
    render(<MessagesSection />)
    const list = within(await screen.findByRole('navigation', { name: 'Conversaciones' }))
    expect(list.getByRole('link', { name: /Casa Azul/ })).toHaveAttribute('href', '#/cuenta/mensajes/c1')
    expect(list.getByText('Ana Pérez')).toBeInTheDocument()
    expect(list.getByLabelText('2 sin leer')).toBeInTheDocument()
    expect(list.getByText('Conversación directa')).toBeInTheDocument()
    expect(list.getByText('Tú: Gracias')).toBeInTheDocument()
  })

  it('asks to pick one when none is open', async () => {
    svc.listConversations.mockResolvedValue([conversation()])
    render(<MessagesSection />)
    expect(await screen.findByText('Elige una conversación para leerla.')).toBeInTheDocument()
    expect(svc.listThread).not.toHaveBeenCalled()
  })

  it('says when the conversation in the URL is not theirs', async () => {
    svc.listConversations.mockResolvedValue([conversation()])
    window.location.hash = '#/cuenta/mensajes/otra'
    render(<MessagesSection />)
    expect(await screen.findByText('No se encontró esta conversación.')).toBeInTheDocument()
  })

  describe('an open conversation', () => {
    beforeEach(() => {
      window.location.hash = '#/cuenta/mensajes/c1'
      svc.listConversations.mockResolvedValue([conversation({ unread: 1 })])
      svc.listThread.mockResolvedValue([
        message({}),
        message({ id: 'm2', sender_id: 'creator-1', recipient_id: 'sub-1', sender_name: 'Ana Pérez', body: 'Claro, escríbeme' }),
      ])
    })

    it('shows the messages and the project it is about', async () => {
      render(<MessagesSection />)
      const thread = within(await screen.findByRole('region', { name: 'Conversación' }))
      expect(await thread.findByText('Hola')).toBeInTheDocument()
      expect(thread.getByText('Claro, escríbeme')).toBeInTheDocument()
      expect(thread.getByRole('link', { name: 'Casa Azul' })).toHaveAttribute('href', '#/proyectos/p1')
      expect(svc.listThread).toHaveBeenCalledWith('c1')
    })

    it('marks what it received as read and refreshes the list', async () => {
      render(<MessagesSection />)
      await screen.findByText('Hola')
      await waitFor(() => expect(svc.markConversationRead).toHaveBeenCalledWith('c1', 'sub-1'))
      await waitFor(() => expect(svc.listConversations).toHaveBeenCalledTimes(2))
    })

    it('does not mark anything when it is all read already', async () => {
      svc.listThread.mockResolvedValue([message({ sender_id: 'creator-1', recipient_id: 'sub-1', read_at: '2026-11-10T12:00:00Z' })])
      render(<MessagesSection />)
      await screen.findByText('Hola')
      expect(svc.markConversationRead).not.toHaveBeenCalled()
    })

    it('replies to the other person, about the same project, and clears the box', async () => {
      svc.sendReply.mockResolvedValue(message({ id: 'm3', body: 'Gracias' }))
      render(<MessagesSection />)
      await screen.findByText('Hola')
      await userEvent.type(screen.getByLabelText('Mensaje'), '  Gracias ')
      await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
      expect(svc.sendReply).toHaveBeenCalledWith(expect.objectContaining({ otherId: 'creator-1', projectId: 'p1' }), 'Gracias')
      expect(await screen.findAllByText('Gracias')).not.toHaveLength(0)
      expect(screen.getByLabelText('Mensaje')).toHaveValue('')
    })

    it('does not send an empty message', async () => {
      render(<MessagesSection />)
      await screen.findByText('Hola')
      expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    })

    it('keeps the text and shows the error when sending fails', async () => {
      svc.sendReply.mockRejectedValue(new Error('Tu cuenta no puede enviar mensajes a este contacto.'))
      render(<MessagesSection />)
      await screen.findByText('Hola')
      await userEvent.type(screen.getByLabelText('Mensaje'), 'Gracias')
      await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('no puede enviar mensajes')
      expect(screen.getByLabelText('Mensaje')).toHaveValue('Gracias')
    })
  })

  it('offers to retry when the list cannot be loaded', async () => {
    svc.listConversations.mockRejectedValueOnce(new Error('No se pudieron cargar tus mensajes. Inténtalo de nuevo.'))
    render(<MessagesSection />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar tus mensajes')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Aún no tienes conversaciones.')).toBeInTheDocument()
  })
})
