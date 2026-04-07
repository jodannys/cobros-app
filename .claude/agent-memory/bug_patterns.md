---
name: Patrones de bugs recurrentes
description: Bugs encontrados en auditoria abril 2026 — creditos.js, pagos.js, cascade.js
type: project
---

Bugs encontrados en auditoria de abril 2026:

1. cuotaDiaria guardada sin Math.round — genera centavos flotantes que hacen fallar validacion de cuotasCubiertas en calcularEstadoAtraso
2. totalPagado sin Number() en renderCreditoCard linea 64 y cerrarCredito linea 484 — silencioso si monto se guarda como string
3. eliminarCredito (creditos.js) NO crea movimiento gasto_cobrador para las cuotas ya cobradas — mochila queda inflada
4. _pagoProcesando nunca se resetea si el usuario cierra el modal sin confirmar el pago
5. eliminarCobradorCascade no elimina creditos ni pagos de sus clientes — genera huerfanos en Firestore
6. limpiarHuerfanos borra pagos directamente (DB.delete) sin marcarlos como eliminado=true — rompe historial cuadre

**Why:** Proyecto en produccion activa con cobradores reales en Peru. Errores monetarios tienen impacto directo en caja.
**How to apply:** Revisar siempre Math.round en cuotaDiaria, Number() en reduces de monto, y simetria de movimientos_cartera al eliminar.
