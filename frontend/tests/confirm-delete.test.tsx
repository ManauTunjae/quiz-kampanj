import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDelete } from '@/components/admin/confirm-delete'
import { ApiError } from '@/lib/api'

function setup(onConfirm = vi.fn().mockResolvedValue(undefined)) {
  render(
    <ConfirmDelete
      label="Radera"
      question="Radera Anna Test?"
      confirmLabel="Ja, radera"
      onConfirm={onConfirm}
    />
  )
  return { onConfirm, user: userEvent.setup() }
}

describe('ConfirmDelete', () => {
  it('raderar inte direkt: frågar först', async () => {
    const { onConfirm, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Radera' }))
    expect(screen.getByText('Radera Anna Test?')).toBeTruthy()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('fokus startar på Avbryt (det säkra valet)', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Radera' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Avbryt' }))
  })

  it('Avbryt och Escape stänger frågan utan att radera', async () => {
    const { onConfirm, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Radera' }))
    await user.click(screen.getByRole('button', { name: 'Avbryt' }))
    expect(screen.queryByText('Radera Anna Test?')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Radera' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Radera Anna Test?')).toBeNull()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('raderar först efter bekräftelse, och bara en gång vid dubbelklick', async () => {
    let finish!: () => void
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    const { user } = setup(onConfirm)
    await user.click(screen.getByRole('button', { name: 'Radera' }))
    const yes = screen.getByRole('button', { name: 'Ja, radera' })
    await user.dblClick(yes)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Raderar…' })).toHaveProperty('disabled', true)
    finish()
  })

  it('visar felet från servern och låter dig försöka igen', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new ApiError(404, 'Leaden finns inte'))
    const { user } = setup(onConfirm)
    await user.click(screen.getByRole('button', { name: 'Radera' }))
    await user.click(screen.getByRole('button', { name: 'Ja, radera' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Leaden finns inte'))
    expect(screen.getByRole('button', { name: 'Ja, radera' })).toHaveProperty('disabled', false)
  })
})
