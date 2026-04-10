---
name: Arquitectura del proyecto cobros-app
description: Estructura de archivos JS, colecciones Firestore y patron de datos clave para auditorias futuras
type: project
---

App de cobros en HTML/JS vanilla con Firebase Firestore SDK v8 (compat).

**Archivos clave:**
- `js/firebase.js` — wrappers fbGetAll, fbSet, fbUpdate, fbDelete, fbGetSince (polling por updatedAt)
- `js/db.js` — capa de caché local + polling cada 45s (reemplazó onSnapshot permanente)
- `js/cajachica.js` — lógica de caja chica: getCajaChicaDelDia, renderPanelCajaChica
- `js/cartera.js` — lógica de mochila del cobrador: _calcularMochila, getSaldoMochilaHasta
- `js/cuadre.js` — getCuadreDelDia, calcularMetaReal
- `js/pagos.js` — guardarPago, pagoRapido
- `js/creditos.js` — guardarCredito, eliminarCredito, cerrarCredito, guardarCreditoEditado
- `js/admin.js` — renderAdmin, guardarUsuario, guardarCreditoEditado, eliminarCobrador
- `js/cascade.js` — eliminarClienteCascade, eliminarCreditoCascade, eliminarCobradorCascade, limpiarHuerfanos
- `js/modals.js` — renderModal, renderModalNuevoCredito, renderModalNuevoCliente
- `js/auth.js` — renderLogin, bindLogin, logout
- `js/clientes.js` — guardarCliente, actualizarCliente, eliminarCliente
- `js/dialogs.js` — showAlert, showConfirm, showPrompt (reemplazan alert/confirm nativos)
- `js/state.js` — estado global
- `js/main.js` — entry point

**Colecciones Firestore:**
- `users` — rol: admin/cobrador, user, pass (texto plano), nombre, telefono
- `clientes` — cobradorId asignado, dni, nombre, lat, lng, foto
- `creditos` — monto, total, cuotaDiaria, diasTotal, fechaInicio, fechaFin, activo, clienteId, seguro, montoSeguro, porcentajeSeguro, montoEntregado, mora_activa
- `pagos` — creditoId, clienteId, cobradorId, monto, aplicadoSaldo, aplicadoMora, tipo, fecha, eliminado
- `gastos` — cobradorId, monto, descripcion, fecha
- `cajas` — cobradorId, monto, fecha (caja asignada por admin)
- `movimientos_cartera` — tipo (inyeccion/envio_cobrador/gasto_admin/retiro/deposito_cobrador/confirmar_yape/cobro_ajuste/gasto_cobrador), monto, fecha, cobradorId, confirmado
- `notas_cuadre`
- `configuracion` — id: 'dias_no_laborables', fechas: []

**Patron de datos en mochila:**
El saldo de mochila = enviado + cobros + ajustesCobros + seguros + cajasAsignadas - prestamos - gastos - devuelto
"devuelto" incluye: movs con confirmado=true O tipo='confirmar_yape' O tipo='gasto_cobrador'

**Patrones de bugs recurrentes en este proyecto:**
1. Ajustes contables de eliminarCredito usan `today()` en lugar de la fecha original del crédito (distorsiona historial)
2. guardarCreditoEditado NO recalcula montoSeguro/montoEntregado — queda inconsistente con el nuevo monto
3. cuotaDiaria se redondea en guardarCredito pero NO en guardarCreditoEditado — descuadre de centavos
4. guardarCredito NO escribe cobradorId en el crédito — _calcularMochila usa clientesIds para filtrar, lo cual es correcto pero frágil

**Why:** Conocimiento estructural necesario para auditar cualquier bug de saldo o caja chica.
**How to apply:** Usar como referencia antes de buscar bugs relacionados con saldos de cobrador.
