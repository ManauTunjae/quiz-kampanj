import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { HeroQuiz } from '@/components/home/hero-quiz'

describe('HeroQuiz (demo på startsidan)', () => {
  it('visar frågan och tre svar, utan att avslöja rätt svar först', () => {
    render(<HeroQuiz />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.queryByText(/Rätt svar/)).toBeNull()
  })

  it('markerar rätt svar och ger ett meddelande när man svarar rätt', async () => {
    const user = userEvent.setup()
    render(<HeroQuiz />)
    await user.click(screen.getByRole('button', { name: 'Lila' }))
    expect(screen.getByRole('status').textContent).toContain('Rätt!')
    expect(screen.getByText(/✓ Rätt svar/)).toBeTruthy()
  })

  it('visar vilket som var rätt, och vilket man valde, när man svarar fel', async () => {
    const user = userEvent.setup()
    render(<HeroQuiz />)
    await user.click(screen.getByRole('button', { name: 'Grön' }))
    expect(screen.getByRole('status').textContent).toContain('Rätt svar är lila')
    expect(screen.getByText('Ditt svar')).toBeTruthy()
    expect(screen.getByText(/✓ Rätt svar/)).toBeTruthy()
  })

  it('går inte att byta svar efter att man har svarat, men "Prova igen" nollställer', async () => {
    const user = userEvent.setup()
    render(<HeroQuiz />)
    await user.click(screen.getByRole('button', { name: 'Grön' }))
    await user.click(screen.getByRole('button', { name: /Lila/ }))
    expect(screen.getByText('Ditt svar')).toBeTruthy() // fortfarande Grön
    await user.click(screen.getByRole('button', { name: 'Prova igen' }))
    expect(screen.queryByText(/Rätt svar/)).toBeNull()
  })
})
