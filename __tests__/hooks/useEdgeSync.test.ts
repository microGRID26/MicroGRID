import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock the edge-sync module before importing the hook
const mockSendToEdge = vi.fn()
const mockSyncFundingToEdge = vi.fn()

vi.mock('@/lib/api/edge-sync', () => ({
  sendToEdge: (...args: unknown[]) => mockSendToEdge(...args),
  syncFundingToEdge: (...args: unknown[]) => mockSyncFundingToEdge(...args),
}))

import { useEdgeSync } from '@/lib/hooks/useEdgeSync'

describe('useEdgeSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all expected functions', () => {
    const { result } = renderHook(() => useEdgeSync())
    expect(result.current.notifyInstallComplete).toBeTypeOf('function')
    expect(result.current.notifyPTOReceived).toBeTypeOf('function')
    expect(result.current.notifyStageChanged).toBeTypeOf('function')
    expect(result.current.notifyFundingMilestone).toBeTypeOf('function')
    expect(result.current.notifyInService).toBeTypeOf('function')
    expect(result.current.send).toBeTypeOf('function')
  })

  it('notifyInstallComplete sends event and syncs funding', () => {
    const { result } = renderHook(() => useEdgeSync())
    result.current.notifyInstallComplete('PROJ-100', '2026-04-01')
    expect(mockSendToEdge).toHaveBeenCalledWith('project.install_complete', 'PROJ-100', {
      install_complete_date: '2026-04-01',
    })
    expect(mockSyncFundingToEdge).toHaveBeenCalledWith('PROJ-100')
  })

  it('notifyPTOReceived sends event and syncs funding', () => {
    const { result } = renderHook(() => useEdgeSync())
    result.current.notifyPTOReceived('PROJ-200', '2026-04-05')
    expect(mockSendToEdge).toHaveBeenCalledWith('project.pto_received', 'PROJ-200', {
      pto_date: '2026-04-05',
    })
    expect(mockSyncFundingToEdge).toHaveBeenCalledWith('PROJ-200')
  })

  it('notifyStageChanged sends old and new stage', () => {
    const { result } = renderHook(() => useEdgeSync())
    result.current.notifyStageChanged('PROJ-300', 'design', 'permit')
    expect(mockSendToEdge).toHaveBeenCalledWith('project.stage_changed', 'PROJ-300', {
      old_stage: 'design',
      new_stage: 'permit',
    })
  })

  it('notifyFundingMilestone sends milestone and status', () => {
    const { result } = renderHook(() => useEdgeSync())
    result.current.notifyFundingMilestone('PROJ-400', 'M1', 'Eligible')
    expect(mockSendToEdge).toHaveBeenCalledWith('funding.milestone_updated', 'PROJ-400', {
      milestone: 'M1',
      status: 'Eligible',
    })
  })

  it('notifyInService sends in_service event with today date', () => {
    const { result } = renderHook(() => useEdgeSync())
    result.current.notifyInService('PROJ-500')
    expect(mockSendToEdge).toHaveBeenCalledWith('project.in_service', 'PROJ-500', {
      in_service_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })
  })

  it('send passes through custom event type and data', () => {
    const { result } = renderHook(() => useEdgeSync())
    result.current.send('project.updated' as any, 'PROJ-600', { custom: 'data' })
    expect(mockSendToEdge).toHaveBeenCalledWith('project.updated', 'PROJ-600', { custom: 'data' })
  })

  it('all functions are fire-and-forget (return undefined)', () => {
    const { result } = renderHook(() => useEdgeSync())
    expect(result.current.notifyInstallComplete('PROJ-1', '2026-01-01')).toBeUndefined()
    expect(result.current.notifyPTOReceived('PROJ-1', '2026-01-01')).toBeUndefined()
    expect(result.current.notifyStageChanged('PROJ-1', 'a', 'b')).toBeUndefined()
    expect(result.current.notifyFundingMilestone('PROJ-1', 'M1', 'Eligible')).toBeUndefined()
    expect(result.current.notifyInService('PROJ-1')).toBeUndefined()
  })

  it('does not throw when sendToEdge rejects', () => {
    mockSendToEdge.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useEdgeSync())
    // Should not throw — fire-and-forget
    expect(() => result.current.notifyInstallComplete('PROJ-1', '2026-01-01')).not.toThrow()
  })
})
