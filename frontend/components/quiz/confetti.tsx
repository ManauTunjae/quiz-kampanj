'use client'

import { useEffect, useRef } from 'react'

// Konfetti i paletten. Ritas på en canvas, inga extra paket.
// Spelas en gång (ca 3,5 sekunder). Med "minska rörelse" visas ingen konfetti alls.
const COLORS = ['#FFE3D8', '#E3B6B1', '#845162', '#C98FA0'] // blush-100, blush-300, mauve-500, ljusare mauve
const COUNT = 140
const DURATION_MS = 3500

type Piece = {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  angle: number
  spin: number
  flutter: number
  color: string
}

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = window.innerWidth
    const height = window.innerHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Alla bitar skjuts uppåt från mitten av skärmen och faller sedan ner
    const pieces: Piece[] = Array.from({ length: COUNT }, () => {
      const direction = -Math.PI / 2 + (Math.random() - 0.5) * 1.6
      const speed = 8 + Math.random() * 9
      return {
        x: width / 2 + (Math.random() - 0.5) * 80,
        y: height * 0.45,
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        flutter: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }
    })

    let frame = 0
    const start = performance.now()

    function draw(now: number) {
      const t = now - start
      ctx!.clearRect(0, 0, width, height)
      if (t >= DURATION_MS) return

      // Tonas ut under sista 30 %
      const fade = t > DURATION_MS * 0.7 ? 1 - (t - DURATION_MS * 0.7) / (DURATION_MS * 0.3) : 1
      for (const p of pieces) {
        p.vy += 0.28 // tyngdkraft
        p.vx *= 0.99 // luftmotstånd
        p.vy *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.angle += p.spin
        p.flutter += 0.15

        ctx!.save()
        ctx!.globalAlpha = Math.max(fade, 0)
        ctx!.translate(p.x, p.y)
        ctx!.rotate(p.angle)
        ctx!.scale(1, Math.cos(p.flutter)) // gör att bitarna "fladdrar"
        ctx!.fillStyle = p.color
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx!.restore()
      }
      frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [])

  // aria-hidden: konfettin är bara dekoration. pointer-events-none: den blockerar aldrig klick.
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 h-full w-full"
    />
  )
}
