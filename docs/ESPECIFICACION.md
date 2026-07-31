# Especificación funcional — App "CompraSanJose"

> Documento consolidado y aprobado como base de diseño. Cualquier cambio se refleja aquí
> antes de construir. Estado: **listo para diseño de datos + mockup**.

## 1. Objetivo
App **AppSheet sobre Google Sheets**, **compartida** con el grupo y **usable desde el móvil**,
para **planificar el menú** de una comida en grupo y **calcular la lista de la compra** por
tramos, de forma flexible y colaborativa.

## 2. Evento y comensales
- **Fechas:** sábado **1 ago 2026** (solo **cena**) → domingo **9 ago 2026** (almuerzos y cenas).
- **Comensales por categoría** (editables, se pueden añadir/quitar): **7 ♂ · 7 ♀ · 3 niños**
  (14 adultos + 3 niños). [RF-25]
- **Raciones** (platos generales): ♂ y ♀ = 1 ración adulta; niño = 0,5. [RF-17]
- **Barbacoa**: porciones específicas por categoría en gramos (ver §7.2). [RF-26]
- Cambiar comensales **recalcula la próxima compra**. [RF-16]

## 3. Catálogo de recetas (pool)
Puede haber **más recetas que huecos**; algunas quedan disponibles **sin programar**. [RF-21]
El **momento (almuerzo/cena) NO es fijo**: lo decide la asignación en el calendario; la
receta solo lleva un *momento sugerido*. [RF-22]

**14 recetas base** (María + pisto de respaldo):
| Receta | Momento sugerido | Notas |
|---|---|---|
| Arroz campero | Almuerzo | Tomate **natural** |
| Migas | Almuerzo | |
| Musaka griega | Almuerzo | **Ternera** (no cordero); tomate **tamizado** |
| Chili con carne | Almuerzo | Con arroz |
| Couscous | Almuerzo | Tomate tamizado (**poco**); zanahoria **opcional** |
| Salmorejo con acompañamiento | Almuerzo | Acompañamiento elegible (grupo con tope) |
| Asado de pollo y patatas | Almuerzo | El "asado carne/pescado" |
| Plato alpujarreño con huevos | Almuerzo | Patatas a lo pobre + embutido + huevos |
| Pisto de verduras con huevos | Almuerzo | **Respaldo** (cebolla, tomate frito, pimiento verde) |
| Barbacoa | Cena | **2 instancias** (BBQ1 cerdo, BBQ2 vacuno) |
| Fajitas | Cena | |
| Fritura de pescado | Cena | Grupo de pescados + adobo + tempura |
| Pizzas | Cena | |
| Hamburguesas | Cena | |

Cada receta tiene **cocinero asignado** [RF-31] (Manolo → barbacoa/migas/fajitas, Dan →
chili, Paco → musaka/couscous/alpujarreño/asado/fritura/salmorejo, Elisa → …). El cocinero
se muestra en el calendario y se puede **cambiar por instancia**.

## 4. Requisitos funcionales

### Acceso y usuarios
- **RF-01** Acceso multiusuario con cuenta **Gmail o Microsoft**.
- **RF-02** Apartado para **ver/añadir/quitar** usuarios con acceso.
- **RF-18** **Invitación por enlace ABIERTO**: el invitado abre el enlace, se autentica y
  queda **añadido automáticamente** a la lista de usuarios (vía `USEREMAIL()`), sin gestión manual.

### Calendario y planificación
- **RF-03** Calendario 1–9 ago (sáb 1 solo cena).
- **RF-04** **Cualquier usuario** asigna/mueve/reordena almuerzos y cenas; estado **compartido**.
- **RF-05** Ver **menú por día**.
- **RF-32** Vista de calendario **esquemática**: **día · almuerzo/cena · plato · cocinero**.
- **RF-21** Catálogo tipo pool (recetas disponibles ≠ programadas).
- **RF-22** Momento no fijo (lo decide el calendario).
- **RF-24** **Instancias repetibles con ajustes propios**: una comida se programa varias
  veces y cada instancia puede variar **cantidades o ingredientes** sin tocar la receta base.

### Recetas e ingredientes
- **RF-09/RF-12** Vista de receta: **ingredientes con cantidad/peso** + **modo de preparación
  editable**.
- **RF-19** **Edición flexible**: añadir/quitar/editar ingredientes por receta o instancia;
  marcar ingredientes como **opcionales** (p. ej. zanahoria del couscous).
- **RF-31** Cocinero asignado por receta (override por instancia).
- **RF-28** Tomate por plato: **arroz = natural**; **tamizado solo** en musaka (100 g) y
  **poco** en couscous; el resto sin cambio.

### Grupos de ración con tope (reparto proporcional) [RF-20]
Una comida puede tener grupos con **objetivo por comensal**; los componentes se **reparten**
ese total por proporción: `cant = objetivo × comensales × (peso ÷ Σ pesos)`. Añadir/quitar un
componente **renormaliza** y el total **no se rebasa**. Aplica a:
- **RF-26 Barbacoa** — carne por comensal seleccionable:
  - Por defecto: **300 g ♂ · 200 g ♀ · 100 g niño**.
  - Reducido (**si incluye mazorcas**): **200 g ♂ · 150 g ♀ · 100 g niño**.
  - Carnes: costillas, chuletas, **pinchitos** [RF-27], chorizo, panceta, salchichas,
    **morcilla con cebolla**; **mazorcas de maíz** como componente aparte.
- **RF-23 Fritura de pescado** — boquerones, calamar, rosada, **cazón adobado**…, con notas
  de **adobo** (vinagre, pimentón, comino, ajo, orégano) y **harina de tempura**.
- Acompañamiento del **salmorejo** y toppings de **pizza** (mismo mecanismo).

### Compra por tramos
- **RF-06** **Compra vigente** = desde **hoy** hasta la **siguiente fecha de compra marcada**.
- **RF-07** Los **usuarios marcan las fechas de compra**; la app deduce, por la fecha actual,
  **qué compra toca** y **hasta dónde llega**.
- **RF-08** **Descartar** elementos ya comprados de una compra.
- **RF-10** Mostrar el **total** de la compra (y pendiente).
- **RF-15** **Despensa/existencias** como salvaguarda: lo disponible **se descuenta** de la compra.
- **RF-14** Lista **exportable en checklist**; marcar lo que **ya se tiene** para no recomprar.
- **Unificación**: "en existencias", "descartar comprado" y "ya lo tengo" son **un único
  mecanismo**; al cerrar una compra se puede **"pasar lo comprado a despensa"**.

### Staples y listas abiertas
- **RF-29** **Compra única / staples** en **3 listas editables**: **Cocina/Despensa**
  (aceite, especias, **sal de escamas**, **red de ajos**, vino de cocinar…), **Bebidas**,
  **Picoteo**. La app propone contenido inicial; el usuario lo edita.
- **RF-30** **Listas abiertas "por paquete/envase"** para **desayunos**, **picoteo** y
  **bebidas nocturnas**: se añaden ítems libres (leche, bizcochos, cereales…) y se compran
  **por envase**, usando **peso/volumen estándar del envase** y **consumo por persona·día**
  para estimar el nº de paquetes.
  *Ej.: leche 1 L · 0,2 L/pers·día × 17 × 9 días ≈ 31 briks.*

### Productos y fotos
- **RF-13** **Foto del producto** (mayoría **Mercadona**) para identificarlo. Se construye un
  **repositorio local en `imagenes/<producto>/`**, imágenes **normalizadas a tamaño uniforme**;
  **sustituibles** desde el móvil.
- Un **ingrediente** puede mapearse a un **producto Mercadona** con **formato de envase**.

## 5. Estructura de la app (5 secciones, móvil)
1. **🛒 Comprar (inicio):** compra vigente por sección del súper, con foto, cantidad, checkbox
   "comprado", total y "exportar checklist". Añadir suelto rápido.
2. **📅 Calendario:** esquema día · almuerzo/cena · plato · cocinero; asignar/mover.
3. **🍽️ Comidas y recetas:** ingredientes con cantidades + preparación editable + foto.
4. **🥫 Existencias:** despensa que se descuenta.
5. **⚙️ Ajustes:** comensales (♂/♀/niño), fechas de compra, staples (3 listas), listas
   abiertas (desayuno/picoteo/bebidas), usuarios, productos y fotos.

### Presentación / usabilidad (no funcional)
- **RF-33** Diseño **amigable en móvil Android e iPhone de los últimos ~3 años**: layout
  **responsive**, objetivos táctiles grandes, texto legible sin zoom, imágenes que se adaptan,
  sin scroll horizontal. Rango de referencia ≈ **360–430 px** de ancho lógico (p. ej. iPhone
  SE/13/14/15, Pixel/Galaxy recientes). Uso con **una mano** y **offline** en el súper.

## 6. Modelo de datos (tablas)
`Config/Comensales` (♂,♀,niños) · `Usuarios` (email, proveedor, alta auto) ·
`Personas/Cocineros` · `Recetas` (plato: momento sugerido, cocinero, texto receta, foto) ·
`RecetaItems` (ingrediente, cantidad/comensal, grupo, peso-en-grupo, opcional) ·
`Grupos` (objetivo/comensal por categoría) · `Ingredientes` (categoría súper, unidad,
es-staple, lista) · `Productos` (Mercadona: foto, envase, peso-envase) ·
`Instancias/Menu` (plato, fecha, momento, cocinero, overrides) · `InstanciaItems` (overrides) ·
`Compras` (fechas marcadas) · `Existencias` (despensa) ·
`ListasAbiertas` (desayuno/picoteo/bebidas, envase, consumo). **La lista de la compra es
derivada**, no se teclea.

## 7. Reglas de cálculo (resumen)
### 7.1 Platos generales
`cantidad = cantidad_por_comensal × [ (nº♂ + nº♀) + nº_niños × 0,5 ]`, sumando las instancias
dentro de la **compra vigente**, menos **existencias**.
### 7.2 Barbacoa (grupo carne)
`carne_total = nº♂×g♂ + nº♀×g♀ + nº_niños×g_niño` (según nivel elegido), repartida entre las
carnes por proporción. Mazorcas y pan aparte.
### 7.3 Listas abiertas
`paquetes = ⌈ consumo_pers_día × comensales × días ÷ tamaño_envase ⌉`.

## 8. No objetivos
Coste/presupuesto · pedidos online · inventario permanente · alérgenos · recetas paso a paso
guiadas · asignación de compra/fregado (lo hacen todos).

## 9. Construcción (cuando se apruebe)
1. **Datos**: generar el modelo en Google Sheets (Drive ya autorizado).
2. **Imágenes**: descargar y normalizar el repositorio local `imagenes/`.
3. **AppSheet**: montaje guiado paso a paso (no hay API de construcción; guía en
   `APPSHEET_SETUP.md`). Nivel avanzado (dinámico) + vista básica de checklist.
4. **Despliegue**: enlace abierto + alta automática de usuarios.
