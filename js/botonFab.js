// ── Restaurar posición guardada ───────────────────────────────
// Se llama al final de cada render() para que el nuevo DOM tenga la posición guardada
window.restoreFabPosition = function () {
  const fab = document.querySelector('.fab')
  if (!fab) return
  try {
    const saved = JSON.parse(localStorage.getItem('ff-fab-pos'))
    if (saved) {
      fab.style.left   = saved.x + 'px'
      fab.style.top    = saved.y + 'px'
      fab.style.right  = 'auto'
      fab.style.bottom = 'auto'
    }
  } catch {}
}

// ── Drag con snap al borde ────────────────────────────────────
document.addEventListener('pointerdown', e => {
  const fab = e.target.closest('.fab')
  if (!fab) return

  e.preventDefault()
  fab.setPointerCapture(e.pointerId)

  const SIZE   = fab.offsetWidth
  const MARGIN = 8
  const navH   = document.querySelector('.bottom-nav')?.offsetHeight || 65

  let moved = false

  const rect  = fab.getBoundingClientRect()
  const startX = e.clientX - rect.left
  const startY = e.clientY - rect.top

  const onMove = e => {
    moved = true

    const x = Math.min(
      Math.max(MARGIN, e.clientX - startX),
      window.innerWidth - SIZE - MARGIN
    )
    const y = Math.min(
      Math.max(MARGIN, e.clientY - startY),
      window.innerHeight - SIZE - MARGIN - navH
    )

    fab.style.left   = x + 'px'
    fab.style.top    = y + 'px'
    fab.style.right  = 'auto'
    fab.style.bottom = 'auto'
  }

  const snapToEdge = () => {
    const r = fab.getBoundingClientRect()
    const x = r.left < window.innerWidth / 2
      ? MARGIN
      : window.innerWidth - SIZE - MARGIN
    const y = Math.min(Math.max(MARGIN, r.top), window.innerHeight - SIZE - MARGIN - navH)

    fab.style.left = x + 'px'
    fab.style.top  = y + 'px'

    try { localStorage.setItem('ff-fab-pos', JSON.stringify({ x, y })) } catch {}
  }

  const cleanup = () => {
    fab.removeEventListener('pointermove',  onMove)
    fab.removeEventListener('pointerup',    onUp)
    fab.removeEventListener('pointercancel', onCancel)
  }

  const onUp = () => {
    cleanup()
    if (moved) {
      snapToEdge()
      // Marcar en estado global para que el click no dispare la acción
      window._fabDragged = true
      setTimeout(() => { window._fabDragged = false }, 0)
    }
  }

  // Bug fix: limpiar listeners si el pointer es cancelado (llamada entrante, etc.)
  const onCancel = () => { cleanup() }

  fab.addEventListener('pointermove',   onMove)
  fab.addEventListener('pointerup',     onUp)
  fab.addEventListener('pointercancel', onCancel)
}, { passive: false })

// Evitar que un drag dispare el onclick del FAB
document.addEventListener('click', e => {
  if (window._fabDragged && e.target.closest('.fab')) {
    e.stopImmediatePropagation()
    e.preventDefault()
  }
}, true)
