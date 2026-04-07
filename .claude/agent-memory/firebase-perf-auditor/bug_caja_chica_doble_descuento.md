---
name: Bug doble descuento caja chica al dia siguiente
description: Bug critico donde la caja del cobrador se descuenta automaticamente al dia siguiente por doble computo de movimientos tipo confirmar_yape
type: project
---

**Bug reportado (2026-04-07):** El saldo de caja chica del cobrador se reduce solo al dia siguiente.

**Causa raiz identificada:** Doble descuento en `_calcularMochila` (cartera.js linea 50-58) + `getCajaChicaDelDia` (cajachica.js linea 43-49).

En `_calcularMochila`, la variable `devuelto` incluye TODOS los movimientos `confirmar_yape` sin importar fecha (cuando fechaLimite=null) — esto ya descuenta el retiro del saldo histórico total.

En `getCajaChicaDelDia`, `arrastreAnterior = getSaldoMochilaHasta(cobradorId, fecha)` llama a `_calcularMochila` con fechaLimite = hoy, usando `f < fechaLimite` (ESTRICTO). El día del retiro, el filtro excluye el movimiento porque `f < hoy` es false cuando f === hoy. Al dia siguiente, `f < manana` es true, entonces el movimiento YA entra en `devuelto` del arrastre, reduciendo `arrastreAnterior`. Y si además ese movimiento.fecha === fecha (hoy), también entra en `entregadoHoy`, causando DOBLE descuento.

**Archivos afectados:**
- `js/cajachica.js` lineas 9-11 y 43-53
- `js/cartera.js` lineas 17-61

**Why:** El arrastre ya deduce el retiro via _calcularMochila. Restarlo de nuevo en entregadoHoy duplica el descuento.
**How to apply:** En auditorias futuras de saldo, verificar siempre que los movimientos tipo confirmar_yape no se resten dos veces en distintas capas de calculo.
