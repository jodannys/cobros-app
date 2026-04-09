// ── FAB arrastrable ──────────────────────────────────────────
document.addEventListener('click', e => {
  const fab = e.target.closest('.fab');
  if (fab && fab._dragged) {
    e.preventDefault();
    e.stopPropagation();
    fab._dragged = false;
  }
});

document.addEventListener('pointerdown', e => {
  const fab = e.target.closest('.fab');
  if (!fab) return;

  let moved = false;
  const startX = e.clientX - fab.getBoundingClientRect().left;
  const startY = e.clientY - fab.getBoundingClientRect().top;

  const onMove = e => {
    moved = true;
    fab._dragged = true;
    const x = e.clientX - startX;
    const y = e.clientY - startY;
    const maxX = window.innerWidth - fab.offsetWidth;
    const maxY = window.innerHeight - fab.offsetHeight;
    fab.style.left = Math.min(Math.max(0, x), maxX) + 'px';
    fab.style.top = Math.min(Math.max(0, y), maxY) + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  };

  const onUp = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    if (!moved) fab._dragged = false;
  };

  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}, { passive: true });