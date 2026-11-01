import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Städa sidan efter varje test, annars ligger knappar kvar från förra testet.
afterEach(cleanup)
