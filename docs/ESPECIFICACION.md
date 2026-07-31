# Especificación funcional — App AppSheet "CompraSanJose"

> Documento vivo. Lo que está como _(asumido)_ es una propuesta inicial que puedes
> confirmar o cambiar. Lo marcado con **❓ POR DEFINIR** necesita tu decisión.
> A medida que lo dictes, se actualiza este documento y se ajusta la app.

## 1. Objetivo
Gestionar y calcular la **lista de la compra** de una comida en grupo de **14 adultos y
3 niños**, a partir de un menú de almuerzos y cenas, con una app AppSheet sobre Google
Sheets usable desde el móvil.

## 2. Comensales y raciones
- Adultos: **14** · Niños: **3** · Factor niño: **0,5** → **15,5 raciones** _(asumido)_.
- ❓ POR DEFINIR: ¿se debe poder cambiar el nº de comensales desde la app y que recalcule?
  _(asumido: sí, editando la tabla Config)_.

## 3. Menú
### Almuerzos
Arroz campero · Mousaka griega · Couscous · Plato alpujarreño con huevos fritos ·
Salmorejo con acompañamiento · Migas · Chili con carne · Asado de pollo y patatas ·
Pisto de verduras con huevos fritos (**respaldo**).
### Cenas
Barbacoa 1 · Barbacoa 2 · Fajitas · Hamburguesas · Pizzas · Fritura de pescado.

- Salmorejo: acompañamiento **elegible en la app** _(asumido: filetes de ternera / lomo /
  pechuga de pollo / flamenquines; por defecto filetes de ternera)_.
- Pisto: es **opción de respaldo** _(asumido: viene desactivado o marcado como respaldo y
  se activa si hace falta)_. ❓ ¿Debe entrar en la lista por defecto o no?
- ❓ POR DEFINIR: ¿se asignan comidas a **días/fechas** concretos? ¿cuántos días dura el
  evento? _(asumido: no hay calendario; solo se marca qué comidas se hacen)_.

## 4. Funcionalidades de la app
| # | Función | Estado |
|---|---|---|
| F1 | Ver el menú separado en Almuerzos / Cenas | _(asumido)_ |
| F2 | Activar/desactivar cada comida (`Incluir`) y recalcular la lista | _(asumido)_ |
| F3 | Elegir el acompañamiento del salmorejo | _(asumido)_ |
| F4 | Lista de la compra agrupada por sección del súper | _(asumido)_ |
| F5 | Marcar cada ingrediente como **Comprado** desde el móvil | _(asumido)_ |
| F6 | Cambiar nº de comensales y recalcular | _(asumido)_ |
| F7 | Coste/presupuesto (precio por ingrediente y total) | ❓ POR DEFINIR |
| F8 | Asignar "quién trae/compra qué" | ❓ POR DEFINIR |
| F9 | Editar cantidades/recetas desde la app | ❓ POR DEFINIR |
| F10 | Añadir ingredientes sueltos fuera de receta (bebidas, hielo, servilletas…) | ❓ POR DEFINIR |
| F11 | Exportar/compartir la lista (PDF, email, WhatsApp) | ❓ POR DEFINIR |
| F12 | Vaciar marcas de "comprado" (empezar de nuevo) | _(asumido: sí, acción)_ |

## 5. Usuarios y compartición
- ❓ POR DEFINIR: ¿la usas **solo tú** o la **comparten** varias personas del grupo?
- ❓ POR DEFINIR: ¿hacen falta **roles** (p.ej. quien edita el menú vs. quien solo marca
  la compra)? _(asumido: un único usuario/editor)_.

## 6. Reglas de cálculo
- `total_ingrediente = Σ (CantidadPorRacion × raciones)` sobre comidas con `Incluir = Sí`.
- Unidades base g/ml/ud; presentación en kg/L cuando procede.
- ❓ POR DEFINIR: ¿redondear a **formato de compra** (p.ej. packs, docenas, botellas)?
  _(asumido: no, se muestra la cantidad exacta consolidada)_.
- ❓ POR DEFINIR: ¿margen de seguridad (% extra) sobre las cantidades? _(asumido: 0%)_.

## 7. Datos (tablas Google Sheets)
Config · Comidas · Ingredientes · Recetas · ListaCompra (ver `MODELO_DATOS.md`).
- ❓ POR DEFINIR si se añaden campos para las funciones marcadas (precio, responsable…).

## 8. Nivel técnico de la app
- ❓ POR DEFINIR: ¿**básico** (checklist de una tabla, se recalcula con el script en local)
  o **avanzado** (recálculo dinámico dentro de AppSheet con columnas virtuales)?
  _(asumido: avanzado, para que F2/F3/F6 funcionen dentro de la app)_.

## 9. Fuera de alcance (por ahora)
- _(asumido)_ Pedidos online, inventario/despensa, recetas paso a paso, control de alérgenos.
- ❓ ¿Algo de esto sí lo quieres?

---
### Cómo rellenarlo
Dime, punto por punto (o en bloque), tus decisiones sobre los **❓ POR DEFINIR** y qué
_(asumido)_ quieres cambiar. Yo actualizo este documento y ajusto los datos y la guía.
