import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ErrorToastProvider, useErrorToast } from '@/components/ErrorToastProvider'

// Test component that exposes the hook
function TestConsumer() {
  const { showError, dismiss, dismissAll } = useErrorToast()
  return (
    <div>
      <button data-testid="show-network" onClick={() => showError('Network error', 'network')}>
        Show Network
      </button>
      <button data-testid="show-auth" onClick={() => showError('Session expired', 'auth')}>
        Show Auth
      </button>
      <button data-testid="show-data" onClick={() => showError('Data error', 'data')}>
        Show Data
      </button>
      <button data-testid="show-unknown" onClick={() => showError('Something broke')}>
        Show Unknown
      </button>
      <button data-testid="dismiss-all" onClick={dismissAll}>
        Dismiss All
      </button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <ErrorToastProvider>
      <TestConsumer />
    </ErrorToastProvider>
  )
}

describe('ErrorToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders children without toasts initially', () => {
    renderWithProvider()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows a toast when showError is called', () => {
    renderWithProvider()
    act(() => {
      screen.getByTestId('show-network').click()
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Network error')
  })

  it('shows different toast types', () => {
    renderWithProvider()

    act(() => { screen.getByTestId('show-auth').click() })
    expect(screen.getByRole('alert')).toHaveTextContent('Session expired')

    act(() => { screen.getByTestId('dismiss-all').click() })
    expect(screen.queryByRole('alert')).toBeNull()

    act(() => { screen.getByTestId('show-data').click() })
    expect(screen.getByRole('alert')).toHaveTextContent('Data error')
  })

  it('auto-dismisses after 5 seconds', () => {
    renderWithProvider()
    act(() => { screen.getByTestId('show-unknown').click() })
    expect(screen.getByRole('alert')).toBeTruthy()

    act(() => { vi.advanceTimersByTime(5000) })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('stacks up to 3 toasts', () => {
    renderWithProvider()
    act(() => {
      screen.getByTestId('show-network').click()
      screen.getByTestId('show-auth').click()
      screen.getByTestId('show-data').click()
    })
    expect(screen.getAllByRole('alert')).toHaveLength(3)
  })

  it('evicts oldest toast when exceeding max', () => {
    renderWithProvider()
    act(() => {
      screen.getByTestId('show-network').click()
      screen.getByTestId('show-auth').click()
      screen.getByTestId('show-data').click()
      screen.getByTestId('show-unknown').click()
    })
    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(3)
    // Network error (oldest) should be evicted
    expect(screen.queryByText('Network error')).toBeNull()
    expect(screen.getByText('Something broke')).toBeTruthy()
  })

  it('deduplicates identical messages', () => {
    renderWithProvider()
    act(() => {
      screen.getByTestId('show-network').click()
      screen.getByTestId('show-network').click()
      screen.getByTestId('show-network').click()
    })
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('dismissAll clears all toasts', () => {
    renderWithProvider()
    act(() => {
      screen.getByTestId('show-network').click()
      screen.getByTestId('show-auth').click()
    })
    expect(screen.getAllByRole('alert')).toHaveLength(2)

    act(() => { screen.getByTestId('dismiss-all').click() })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('throws when useErrorToast is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow('useErrorToast must be used within ErrorToastProvider')
    spy.mockRestore()
  })
})
