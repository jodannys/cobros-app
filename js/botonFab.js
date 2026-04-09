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
  const rect = fab.getBoundingClientRect();
  const startX = e.clientX - rect.left;
  const startY = e.clientY - rect.top;

  const onMove = e => {
    moved = true;
    fab._dragged = true;

    const fabW = fab.offsetWidth;
    const fabH = fab.offsetHeight;

    let x = e.clientX - startX;
    let y = e.clientY - startY;

    x = Math.min(Math.max(0, x), window.innerWidth - fabW);
    y = Math.min(Math.max(0, y), window.innerHeight - fabH);

    fab.style.left = x + 'px';
    fab.style.top = y + 'px';
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