import { useEffect, useRef, useState } from 'react'
import { Eraser, Undo2 } from 'lucide-react'
import { Button } from '../ui/Button'

interface HandwritingPadProps {
  /** Existing capture to preload onto the canvas (a data:image/png;base64,... string), or empty to start blank. */
  value: string
  /** Fires with a data:image/png;base64,... string after every completed stroke, or '' once the pad is cleared empty. */
  onChange: (dataUrl: string) => void
  height?: number
}

/**
 * A ruled writing-board that captures pen/stylus (and mouse/touch as a fallback) strokes via the Pointer
 * Events API and reports the drawing back as a base64 PNG - so it round-trips through the same `string`
 * field a typed note already uses (see HandwritingField, which decides whether that string is prose or a
 * captured image).
 */
export function HandwritingPad({ value, onChange, height = 220 }: HandwritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const historyRef = useRef<string[]>([]) // undo stack of prior PNG snapshots, most recent last
  const loadedValueRef = useRef<string | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const getContext = () => canvasRef.current?.getContext('2d') ?? null

  const drawRuleLines = (ctx: CanvasRenderingContext2D, width: number, canvasHeight: number) => {
    ctx.save()
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    const lineGap = 32
    for (let y = lineGap; y < canvasHeight; y += lineGap) {
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(width, y + 0.5)
      ctx.stroke()
    }
    ctx.restore()
  }

  const clearToBlank = (ctx: CanvasRenderingContext2D, width: number, canvasHeight: number) => {
    ctx.clearRect(0, 0, width, canvasHeight)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, canvasHeight)
    drawRuleLines(ctx, width, canvasHeight)
  }

  // Size the backing store for device pixel ratio so strokes stay crisp on high-DPI screens/tablets.
  const setupCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const cssWidth = canvas.clientWidth || canvas.parentElement?.clientWidth || 600
    canvas.width = cssWidth * ratio
    canvas.height = height * ratio
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1e2a3a'
    clearToBlank(ctx, cssWidth, height)
  }

  const loadImageOnto = (dataUrl: string) => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return
    const ratio = window.devicePixelRatio || 1
    const cssWidth = canvas.width / ratio
    const img = new Image()
    img.onload = () => {
      clearToBlank(ctx, cssWidth, height)
      ctx.drawImage(img, 0, 0, cssWidth, height)
      setIsEmpty(false)
    }
    img.src = dataUrl
  }

  useEffect(() => {
    setupCanvas()
    if (value) {
      loadImageOnto(value)
      loadedValueRef.current = value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // If the field's value is swapped out from outside (e.g. switching patients / re-opening a saved
  // consultation) re-render the pad to match, but don't fight the doctor's own strokes as they draw.
  useEffect(() => {
    if (value === loadedValueRef.current) return
    loadedValueRef.current = value
    if (value) {
      loadImageOnto(value)
    } else {
      const ctx = getContext()
      const canvas = canvasRef.current
      if (ctx && canvas) {
        const ratio = window.devicePixelRatio || 1
        clearToBlank(ctx, canvas.width / ratio, height)
      }
      setIsEmpty(true)
      historyRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const pushHistory = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    historyRef.current = [...historyRef.current.slice(-19), canvas.toDataURL('image/png')]
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Ignore a palm/finger touch while a pen is in range, so stylus users can rest a hand on the pad.
    if (e.pointerType === 'touch' && e.buttons === 0) return
    pushHistory()
    drawingRef.current = true
    lastPointRef.current = pointFromEvent(e)
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const ctx = getContext()
    const last = lastPointRef.current
    if (!ctx || !last) return
    const point = pointFromEvent(e)
    // Pressure-sensitive width when a real stylus reports it; a flat default for mouse/touch.
    const pressure = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5
    ctx.lineWidth = 1.2 + pressure * 2.2
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPointRef.current = point
    setIsEmpty(false)
  }

  const emitChange = () => {
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }

  const handlePointerUp = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastPointRef.current = null
    emitChange()
  }

  const handleClear = () => {
    const ctx = getContext()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    pushHistory()
    const ratio = window.devicePixelRatio || 1
    clearToBlank(ctx, canvas.width / ratio, height)
    setIsEmpty(true)
    onChange('')
  }

  const handleUndo = () => {
    const previous = historyRef.current.pop()
    const ctx = getContext()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    if (!previous) {
      handleClear()
      return
    }
    const img = new Image()
    img.onload = () => {
      const ratio = window.devicePixelRatio || 1
      const cssWidth = canvas.width / ratio
      ctx.clearRect(0, 0, cssWidth, height)
      ctx.drawImage(img, 0, 0, cssWidth, height)
      onChange(canvas.toDataURL('image/png'))
    }
    img.src = previous
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height, touchAction: 'none' }}
        className="block cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      <div className="flex items-center justify-between border-t border-ink-100 bg-surface-muted px-2.5 py-1.5">
        <span className="text-[11px] text-ink-500">Write with a stylus, finger, or mouse.</span>
        <div className="flex gap-1.5">
          <Button type="button" size="sm" variant="ghost" icon={<Undo2 size={13} />} onClick={handleUndo} disabled={isEmpty && historyRef.current.length === 0}>Undo</Button>
          <Button type="button" size="sm" variant="ghost" icon={<Eraser size={13} />} onClick={handleClear} disabled={isEmpty}>Clear</Button>
        </div>
      </div>
    </div>
  )
}
