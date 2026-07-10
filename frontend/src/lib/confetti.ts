// One-shot confetti burst, ported from launchConfetti in prototype/app.js.
// Draws onto the passed canvas for ~2.4s, then hides it. No-ops when the user
// prefers reduced motion.
export function launchConfetti(canvas: HTMLCanvasElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const context = canvas.getContext('2d')
  if (!context) return

  const tokenColor = (name: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const colors = ['--gold', '--net-deep', '--rest', '--prep', '--ember-light'].map(tokenColor)
  const width = window.innerWidth
  const height = window.innerHeight
  const scale = window.devicePixelRatio || 1
  canvas.width = width * scale
  canvas.height = height * scale
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  context.setTransform(scale, 0, 0, scale, 0, 0)
  canvas.hidden = false

  const particles = Array.from({ length: 130 }, () => ({
    x: Math.random() * width,
    y: Math.random() * -height * 0.35,
    w: 4 + Math.random() * 8,
    h: 8 + Math.random() * 12,
    speed: 2 + Math.random() * 4,
    drift: -1.5 + Math.random() * 3,
    turn: Math.random() * Math.PI,
    spin: -0.12 + Math.random() * 0.24,
    color: colors[Math.floor(Math.random() * colors.length)],
  }))
  const started = performance.now()

  function draw(now: number) {
    const elapsed = now - started
    context!.clearRect(0, 0, width, height)
    particles.forEach((particle) => {
      particle.y += particle.speed
      particle.x += particle.drift
      particle.turn += particle.spin
      context!.save()
      context!.translate(particle.x, particle.y)
      context!.rotate(particle.turn)
      context!.fillStyle = particle.color
      context!.globalAlpha = Math.max(0, 1 - elapsed / 2400)
      context!.fillRect(particle.w / -2, particle.h / -2, particle.w, particle.h)
      context!.restore()
    })
    if (elapsed < 2400) {
      window.requestAnimationFrame(draw)
    } else {
      canvas.hidden = true
      context!.clearRect(0, 0, width, height)
    }
  }
  window.requestAnimationFrame(draw)
}
