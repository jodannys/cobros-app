document.addEventListener('pointerdown', e => {
  const fab = e.target.closest('.fab')
  if (!fab) return

  e.preventDefault()
  fab.setPointerCapture(e.pointerId)

  const SIZE = fab.offsetWidth
  const MARGIN = 8

  let moved = false

  const rect = fab.getBoundingClientRect()
  const startX = e.clientX - rect.left
  const startY = e.clientY - rect.top

  const onMove = e => {
    moved = true
    fab._dragged = true

    const x = Math.min(
      Math.max(MARGIN, e.clientX - startX),
      window.innerWidth - SIZE - MARGIN
    )

    const y = Math.min(
      Math.max(MARGIN, e.clientY - startY),
      window.innerHeight - SIZE - MARGIN
    )

    fab.style.left = x + 'px'
    fab.style.top = y + 'px'
    fab.style.right = 'auto'
    fab.style.bottom = 'auto'
  }

  const snapToEdge = () => {
    const rect = fab.getBoundingClientRect()

    const x = rect.left < window.innerWidth / 2
      ? MARGIN
      : window.innerWidth - SIZE - MARGIN

    const y = Math.min(
      Math.max(MARGIN, rect.top),
      window.innerHeight - SIZE - MARGIN
    )

    fab.style.left = x + 'px'
    fab.style.top = y + 'px'

    // guardar posición
    try {
      localStorage.setItem('ff-fab-pos', JSON.stringify({ x, y }))
    } catch {}
  }

  const onUp = () => {
    fab.removeEventListener('pointermove', onMove)
    fab.removeEventListener('pointerup', onUp)

    if (!moved) {
      fab._dragged = false
    } else {
      snapToEdge()
    }
  }

  fab.addEventListener('pointermove', onMove)
  fab.addEventListener('pointerup', onUp)
}, { passive: false })

window.addEventListener('load', () => {
  const fab = document.querySelector('.fab')
  if (!fab) return

  try {
    const saved = JSON.parse(localStorage.getItem('ff-fab-pos'))
    if (saved) {
      fab.style.left = saved.x + 'px'
      fab.style.top = saved.y + 'px'
      fab.style.right = 'auto'
      fab.style.bottom = 'auto'
    }
  } catch {}
})