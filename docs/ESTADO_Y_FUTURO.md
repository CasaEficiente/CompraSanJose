# Estado del proyecto y opciones de futuro

_Cierre de la sesión del 1 de agosto de 2026._

## Qué se completó (100% reutilizable)
El **backend de datos** está terminado y es válido con cualquier herramienta futura:

- **`data/CompraSanJose.xlsx`** (y los 11 CSV): Config, Comidas, Ingredientes, Recetas,
  Calendario, Compras, Despensa, Basicos, ListasAbiertas, Usuarios, ListaCompra.
- **16 comidas** con **modo de preparación de fuente real** + **pasos previos** + **cocinero**.
- **Recetas con cantidades por comensal** y los **cortes de carne** acordados
  (arroz→aguja de vaca + pimiento morrón; couscous→carrillera; BBQ1 presa/secreto/pluma/
  panceta/pinchitos/chorizo/morcilla; BBQ2 entrecot/chuletón/cordero/chistorra/chorizo;
  paella de marisco; fritura con adobo…).
- **Comensales ♂/♀/niños**, objetivos de barbacoa, despensa (con lo ya disponible),
  básicos de cocina y listas por envase (Desayuno/Bebidas/Picoteo).
- **`scripts/build_model.py`**: regenera todo (fuente única de verdad).
- Documentación: `ESPECIFICACION.md` (RF-01..RF-33), `MODELO_DATOS.md`, `RECETAS.md`,
  `APPSHEET_SETUP.md`, y el mockup `mockup.html`.

## Qué se montó en AppSheet (SanJose2026)
App base **usable**: menú navegable, **Recetas** (ficha con cocinero, pasos previos,
preparación, ingredientes), **lista de la compra** agrupada por sección, y tablas
Despensa/Básicos/Listas. Se dejó **sin terminar** la capa **dinámica**.

## Por qué se paró
AppSheet **no tiene API para construir la app** (solo API de datos). Toda la lógica dinámica
—asignar comidas en el calendario, **lista de la compra calculada por días/tramos**,
**descuento de despensa**, **tope de carne de barbacoa con peso pendiente**— hay que
programarla **a mano** con columnas virtuales en el editor visual, clic a clic. Para el plazo
(el evento empezaba ese día) resultó **demasiado lento** y no automatizable.

## Opciones para el año que viene
El cuello de botella fue el **frontend no-code**, no los datos. Alternativas:

1. **App web propia a medida (recomendado).** Una PWA sencilla (HTML/JS o React) que lee el
   Google Sheet o una BD ligera. Toda la lógica dinámica (tramos, despensa, tope de barbacoa)
   es **trivial en código** y se puede desarrollar **de principio a fin sin montaje manual**.
2. **Google Apps Script Web App** sobre el mismo Sheet: lógica en el Sheet/servidor, se
   despliega con pocos clics.
3. **Fórmulas en el propio Google Sheet** (QUERY/SUMIF/ARRAYFORMULA) para la parte de cálculo,
   y cualquier visor encima.
4. Otros no-code (Glide, Bubble…) — evaluar si su curva/coste compensa frente a la opción 1.

**Recomendación:** la opción 1 aprovecha que el modelo de datos ya está hecho y evita el
montaje manual que aquí frenó el proyecto.

## Cómo retomar
1. `python scripts/build_model.py` regenera datos si cambian recetas/comensales.
2. El menú, cantidades y preparaciones ya están; solo hay que elegir frontend.
