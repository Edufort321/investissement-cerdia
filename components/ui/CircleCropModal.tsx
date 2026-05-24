'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'

interface Props {
  src: string
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}

const C = 280   // container size px
const OUT = 440 // output canvas size px

export default function CircleCropModal({ src, onConfirm, onCancel }: Props) {
  const [pos, setPos]     = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const imgRef            = useRef<HTMLImageElement>(null)
  const drag              = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
  const pinchDist         = useRef<number | null>(null)

  // Fit image to circle on load
  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    const onLoad = () => {
      const fit = Math.max(C / img.naturalWidth, C / img.naturalHeight)
      setScale(fit)
    }
    if (img.complete) onLoad()
    else img.addEventListener('load', onLoad)
    return () => img.removeEventListener('load', onLoad)
  }, [src])

  // ── Mouse ──────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    drag.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current) return
    setPos({ x: drag.current.px + e.clientX - drag.current.sx, y: drag.current.py + e.clientY - drag.current.sy })
  }
  const onMouseUp = () => { drag.current = null }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => Math.max(0.3, Math.min(8, s * (1 - e.deltaY * 0.0012))))
  }

  // ── Touch ──────────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0]
      drag.current = { sx: t.clientX, sy: t.clientY, px: pos.x, py: pos.y }
    } else if (e.touches.length === 2) {
      drag.current = null
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchDist.current = Math.hypot(dx, dy)
    }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1 && drag.current) {
      const t = e.touches[0]
      setPos({ x: drag.current.px + t.clientX - drag.current.sx, y: drag.current.py + t.clientY - drag.current.sy })
    } else if (e.touches.length === 2 && pinchDist.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const d  = Math.hypot(dx, dy)
      setScale(s => Math.max(0.3, Math.min(8, s * (d / pinchDist.current!))))
      pinchDist.current = d
    }
  }
  const onTouchEnd = () => { drag.current = null; pinchDist.current = null }

  // ── Confirm ─────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    const img = imgRef.current
    if (!img || !img.complete) return

    const canvas  = document.createElement('canvas')
    canvas.width  = OUT
    canvas.height = OUT
    const ctx     = canvas.getContext('2d')!

    // Circular clip
    ctx.beginPath()
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2)
    ctx.clip()

    // Where the image sits in the container
    const rW     = img.naturalWidth  * scale
    const rH     = img.naturalHeight * scale
    const imgL   = C / 2 + pos.x - rW / 2
    const imgT   = C / 2 + pos.y - rH / 2

    // Source rect in natural image coords that maps to the C×C container
    const sx = -imgL / scale
    const sy = -imgT / scale
    const sW =  C    / scale
    const sH =  C    / scale

    ctx.drawImage(img, sx, sy, sW, sH, 0, 0, OUT, OUT)
    canvas.toBlob(blob => { if (blob) onConfirm(blob) }, 'image/jpeg', 0.93)
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-xs shadow-2xl">

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm"
              style={{ fontFamily: 'Georgia, serif' }}>
            Recadrer la photo de profil
          </h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── Circle viewport ── */}
        <div
          className="relative mx-auto overflow-hidden cursor-move select-none"
          style={{ width: C, height: C, borderRadius: '50%', background: '#1a1a2e' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <img
            ref={imgRef}
            src={src}
            alt="crop"
            className="absolute pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`,
              maxWidth: 'none',
              transformOrigin: 'center center'
            }}
            draggable={false}
          />
          {/* Circle border hint */}
          <div className="absolute inset-0 rounded-full pointer-events-none"
               style={{ boxShadow: 'inset 0 0 0 2px rgba(244,114,182,0.5)' }} />
        </div>

        <p className="text-gray-500 text-xs text-center mt-3 mb-5">
          Glisse pour repositionner &middot; Scroll pour zoomer
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-opacity flex items-center justify-center gap-1.5"
          >
            <Check size={15} /> Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}
