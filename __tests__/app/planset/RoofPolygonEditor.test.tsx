import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RoofPolygonEditor } from '@/app/planset/components/RoofPolygonEditor'

describe('RoofPolygonEditor', () => {
  it('lets the user click points and saves a closed polygon (normalized 0–1)', () => {
    const onSave = vi.fn()
    render(
      <RoofPolygonEditor
        faceId={1}
        initialPolygon={[]}
        onSave={onSave}
        onClose={() => {}}
      />
    )
    const canvas = screen.getByTestId('polygon-canvas')
    // Mock getBoundingClientRect for click coordinate math
    canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 600, height: 400, right: 600, bottom: 400, x: 0, y: 0,
      toJSON: () => ({})
    } as DOMRect)
    fireEvent.click(canvas, { clientX: 100, clientY: 100 })
    fireEvent.click(canvas, { clientX: 300, clientY: 100 })
    fireEvent.click(canvas, { clientX: 200, clientY: 250 })
    fireEvent.click(screen.getByText(/save/i))
    expect(onSave).toHaveBeenCalled()
    const [polygon, setbacks] = onSave.mock.calls[0]
    expect(polygon.length).toBe(3)
    // Each point should be normalized to [0, 1]
    polygon.forEach((pt: [number, number]) => {
      expect(pt[0]).toBeGreaterThanOrEqual(0)
      expect(pt[0]).toBeLessThanOrEqual(1)
      expect(pt[1]).toBeGreaterThanOrEqual(0)
      expect(pt[1]).toBeLessThanOrEqual(1)
    })
    expect(setbacks).toMatchObject({
      ridge: expect.any(Boolean),
      eave: expect.any(Boolean),
      rake: expect.any(Boolean),
      pathClear: expect.stringMatching(/^(walkable|partial|blocked)$/),
    })
  })

  it('lets the user toggle ridge / eave / rake setback checkboxes', () => {
    const onSave = vi.fn()
    // Provide a valid initial polygon so Save is enabled
    const initial: [number, number][] = [[0.1, 0.1], [0.9, 0.1], [0.5, 0.9]]
    render(
      <RoofPolygonEditor
        faceId={1}
        initialPolygon={initial}
        onSave={onSave}
        onClose={() => {}}
      />
    )
    fireEvent.click(screen.getByLabelText(/ridge/i))
    fireEvent.click(screen.getByLabelText(/eave/i))
    fireEvent.click(screen.getByText(/save/i))
    const [, setbacks] = onSave.mock.calls[0]
    expect(setbacks.ridge).toBe(true)
    expect(setbacks.eave).toBe(true)
    expect(setbacks.rake).toBe(false)
  })

  it('initialPolygon is rendered as starting points', () => {
    const initial: [number, number][] = [[0, 0], [1, 0], [0.5, 1]]
    render(
      <RoofPolygonEditor
        faceId={1}
        initialPolygon={initial}
        onSave={() => {}}
        onClose={() => {}}
      />
    )
    const canvas = screen.getByTestId('polygon-canvas')
    // 3 vertex circles should render
    expect(canvas.querySelectorAll('circle').length).toBe(3)
  })

  it('clear button prompts for confirmation and resets points to empty', () => {
    // window.confirm must be mocked — jsdom returns false by default
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onSave = vi.fn()
    const initial: [number, number][] = [[0, 0], [1, 0], [0.5, 1]]
    render(
      <RoofPolygonEditor
        faceId={1}
        initialPolygon={initial}
        onSave={onSave}
        onClose={() => {}}
      />
    )
    fireEvent.click(screen.getByText(/clear/i))
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('3'))
    // After clear, Save is disabled (< 3 points) — verify button is disabled
    const saveBtn = screen.getByText(/save/i).closest('button')
    expect(saveBtn).toBeDisabled()
    confirmSpy.mockRestore()
  })

  it('Escape key closes the editor (calls onClose)', () => {
    const onClose = vi.fn()
    render(
      <RoofPolygonEditor
        faceId={1}
        initialPolygon={[]}
        onSave={() => {}}
        onClose={onClose}
      />
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
