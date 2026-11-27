import { useState, useRef, useEffect, useCallback } from 'react'

export default function ImageCropModal({
  imageSrc,
  title = 'Resize & Position Photo',
  circular = true,
  onClose,
  onApply,
}: {
  imageSrc: string
  title?: string
  circular?: boolean
  onClose: () => void
  onApply: (croppedDataUrl: string) => void
}) {
  const [scale, setScale] = useState(1)
  const [minScale, setMinScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0) // in degrees
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)

  const imageRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const CROP_SIZE = 260 // Viewport crop box width & height in px

  // Load image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageSrc
    img.onload = () => {
      imageRef.current = img
      // Calculate minScale to ensure image covers the crop box
      const scaleX = CROP_SIZE / img.naturalWidth
      const scaleY = CROP_SIZE / img.naturalHeight
      const initialScale = Math.max(scaleX, scaleY)
      setMinScale(initialScale)
      setScale(initialScale)
      setPosition({ x: 0, y: 0 })
      setRotation(0)
      setImageLoaded(true)
    }
  }, [imageSrc])

  // Mouse / Touch handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    setIsDragging(true)
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const touch = e.touches[0]
    if (!touch) return
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.0015
    const newScale = Math.max(minScale * 0.8, Math.min(minScale * 4, scale + delta))
    setScale(newScale)
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleReset = () => {
    setScale(minScale)
    setPosition({ x: 0, y: 0 })
    setRotation(0)
  }

  // Render high-res crop to canvas
  const handleCropAndSave = () => {
    const img = imageRef.current
    if (!img) return

    const exportSize = 400 // High-res output size in px
    const canvas = document.createElement('canvas')
    canvas.width = exportSize
    canvas.height = exportSize
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fill background with white
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, exportSize, exportSize)

    // Translate to center of canvas
    ctx.translate(exportSize / 2, exportSize / 2)

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180)

    // Scaling ratio between preview crop box and exported canvas
    const exportRatio = exportSize / CROP_SIZE
    ctx.scale(exportRatio, exportRatio)

    // Draw image with position and scale
    const renderScale = scale
    const drawWidth = img.naturalWidth * renderScale
    const drawHeight = img.naturalHeight * renderScale

    // In preview, position is relative to center
    ctx.drawImage(
      img,
      position.x - drawWidth / 2,
      position.y - drawHeight / 2,
      drawWidth,
      drawHeight
    )

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92)
    onApply(croppedDataUrl)
  }

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 100 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{
          width: 'min(100%, 460px)',
          background: '#161922',
          color: '#f8fafc',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          style={{ color: '#94a3b8' }}
        >
          ✕
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#2c263e',
              color: '#c4b5fd',
              display: 'grid',
              placeItems: 'center',
              fontSize: '16px',
            }}
          >
            ✂️
          </div>
          <div>
            <h2 style={{ margin: 0, font: '700 17px Manrope, sans-serif', color: '#fff' }}>{title}</h2>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
              Drag to reposition, use slider to zoom in or out.
            </p>
          </div>
        </div>

        {/* Crop Viewport Box */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{
            position: 'relative',
            width: `${CROP_SIZE}px`,
            height: `${CROP_SIZE}px`,
            margin: '0 auto 16px',
            background: '#090b10',
            borderRadius: circular ? '50%' : '12px',
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            boxShadow: '0 0 0 4px #7c3aed, 0 0 0 9999px rgba(0, 0, 0, 0.65)',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          {imageLoaded && imageRef.current && (
            <img
              src={imageSrc}
              alt="Crop preview"
              draggable={false}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) rotate(${rotation}deg) scale(${scale / minScale})`,
                transformOrigin: 'center center',
                maxWidth: 'none',
                width: `${imageRef.current.naturalWidth * minScale}px`,
                height: `${imageRef.current.naturalHeight * minScale}px`,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Grid overlay lines for guidance */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '1px dashed rgba(255, 255, 255, 0.35)',
              borderRadius: circular ? '50%' : '12px',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Controls: Zoom Slider & Actions */}
        <div style={{ display: 'grid', gap: '12px', padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '40px' }}>Zoom</span>
            <input
              type="range"
              min={minScale * 0.8}
              max={minScale * 3.5}
              step={minScale * 0.05}
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              style={{
                flex: 1,
                accentColor: '#8b5cf6',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '10px', color: '#cbd5e1', width: '35px', textAlign: 'right' }}>
              {Math.round((scale / minScale) * 100)}%
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleRotate}
                className="button button-outline"
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  background: '#202434',
                  borderColor: '#2e344a',
                  color: '#e2e8f0',
                }}
                title="Rotate 90 degrees"
              >
                🔄 Rotate
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="button button-outline"
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  background: '#202434',
                  borderColor: '#2e344a',
                  color: '#e2e8f0',
                }}
                title="Reset zoom & position"
              >
                Reset
              </button>
            </div>

            <div style={{ fontSize: '10px', color: '#64748b' }}>
              Drag photo to center
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="modal-actions"
          style={{
            marginTop: '20px',
            borderTop: '1px solid #282d3e',
            paddingTop: '14px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            className="button button-outline"
            style={{ background: 'transparent', borderColor: '#333a4d', color: '#cbd5e1' }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
            onClick={handleCropAndSave}
          >
            ✓ Set as Profile Picture
          </button>
        </div>
      </div>
    </div>
  )
}
