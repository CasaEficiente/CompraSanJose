# Montar la app en AppSheet

Guía para crear la aplicación sobre el Google Sheet, con la cuenta de Google/Gmail.

Hay **dos niveles**. Empieza por el **básico** (funciona en minutos) y pasa al **avanzado**
solo si quieres que la app recalcule la lista al vuelo.

---

## 0) Preparar el Google Sheet

Ya tienes en tu Drive un libro (o varios) con las pestañas: `Config`, `Comidas`,
`Ingredientes`, `Recetas` y `ListaCompra`. Si no, importa los CSV de `data/`:

1. Ve a **Google Sheets → Archivo → Importar → Subir** y sube cada CSV.
2. Al importar, elige **"Insertar hojas nuevas"** para tener cada tabla en su pestaña,
   o crea un libro por tabla.
3. Asegúrate de que la **fila 1 es la cabecera** (nombres de columna) en cada pestaña.

> Consejo: mejor **un único libro** con 5 pestañas → AppSheet las detecta como 5 tablas
> de una sola fuente de datos.

---

## 1) Crear la app

1. Entra en **https://www.appsheet.com** con tu cuenta de Google/Gmail.
2. **Create → App → Start with existing data**.
3. Elige **Google Sheets** y selecciona el libro `CompraSanJose`.
4. AppSheet crea la app con la primera pestaña como tabla inicial.
5. En **Data → Tables → + New Table**, añade el resto de pestañas
   (`Config`, `Comidas`, `Ingredientes`, `Recetas`, `ListaCompra`).

---

## NIVEL BÁSICO — Checklist de compra

Objetivo: llevar la lista de la compra en el móvil, agrupada por sección del súper, y
marcar lo que ya has comprado. Usa solo la tabla **`ListaCompra`**.

1. **Data → Columns → ListaCompra**:
   - `Ingrediente` → marca como **Key** (Label también).
   - `Comprado` → tipo **Enum** con valores `Si`, `No`, o mejor **Yes/No**
     (cambia el tipo a *Yes/No* para tener casilla de verificación).
   - `Categoria` → tipo **Enum**.
   - `CantidadLegible` → tipo **Text** (solo lectura).
2. **UX → Views → + New View**:
   - Nombre: `Compra`
   - For this data: `ListaCompra`
   - View type: **deck** (o **table**).
   - **Group by:** `Categoria`  → así ves Frutería, Carnicería, etc. separadas.
   - **Sort by:** `Ingrediente`.
   - En *Display*, muestra `Ingrediente`, `CantidadLegible` y el toggle `Comprado`.
3. (Opcional) **Format Rules**: si `Comprado = Si` (o TRUE), tacha/atenúa la fila.
4. (Opcional) **Behavior → Actions**: acción "Vaciar carrito" que ponga todos los
   `Comprado = No`.

✅ Con esto ya tienes una app usable. Cuando cambies el menú, vuelve a ejecutar
`python scripts/generar_lista.py`, sube el `ListaCompra.csv` a la pestaña y **Sync**.

---

## NIVEL AVANZADO — Recalcular dentro de la app

Objetivo: activar/desactivar comidas o cambiar el acompañamiento **desde la app** y que la
lista de la compra se recalcule sola, sin tocar Python. Usa las tablas `Config`, `Comidas`,
`Ingredientes` y `Recetas`.

### 2.1 Tipos y claves
- **Comidas**: `Comida` = Key. `Tipo` = Enum (`Almuerzo`,`Cena`). `Incluir` = Enum
  (`Si`,`No`) — o **Yes/No** si prefieres casilla (ajusta las fórmulas de abajo).
- **Ingredientes**: `Ingrediente` = Key. `Categoria` = Enum. `Unidad` = Enum.
- **Recetas**: añade una columna **Key** propia. Lo más simple: en el Sheet, columna
  `RecetaID` con `=Comida & " · " & Ingrediente`. `Comida` = **Ref** a `Comidas`;
  `Ingrediente` = **Ref** a `Ingredientes`; `CantidadPorRacion` = **Number**.
- **Config**: `Clave` = Key, `Valor` = Number.

### 2.2 Columna virtual: raciones totales
En **Recetas**, crea una columna virtual `Raciones` (tipo Number), App formula:

```
  ANY(SELECT(Config[Valor], [Clave] = "Adultos"))
+ ANY(SELECT(Config[Valor], [Clave] = "Ninos"))
* ANY(SELECT(Config[Valor], [Clave] = "FactorNino"))
```

### 2.3 Columna virtual: subtotal por línea
En **Recetas**, columna virtual `Subtotal` (Number), App formula:

```
IF( [Comida].[Incluir] = "Si",
    [CantidadPorRacion] * [Raciones],
    0 )
```

> Si pusiste `Incluir` como **Yes/No**, usa `IF([Comida].[Incluir], ...)`.

### 2.4 Columna virtual: total por ingrediente
En **Ingredientes**, columna virtual `CantidadTotal` (Number), App formula:

```
SUM( SELECT(Recetas[Subtotal], [Ingrediente] = [_THISROW].[Ingrediente]) )
```

Y una columna virtual `CantidadLegible` (Text) para presentación:

```
IF( [Unidad] = "g",  IF([CantidadTotal] >= 1000, (TEXT([CantidadTotal]/1000) & " kg"), (TEXT([CantidadTotal]) & " g")),
IF( [Unidad] = "ml", IF([CantidadTotal] >= 1000, (TEXT([CantidadTotal]/1000) & " L"),  (TEXT([CantidadTotal]) & " ml")),
    TEXT(CEILING([CantidadTotal])) & " ud" ))
```

### 2.5 Marcar comprado
En **Ingredientes**, añade en el Sheet una columna real `Comprado` (Yes/No). No puede ser
virtual porque hay que guardar el estado.

### 2.6 Vista de compra
**UX → Views → + New View**:
- For this data: **Ingredientes**
- View type: **deck**
- **Filtrar** las filas con total > 0: en la vista, *Filter* = `[CantidadTotal] > 0`.
- **Group by:** `Categoria`.
- Muestra `Ingrediente`, `CantidadLegible`, `Comprado`.

### 2.7 Vista de menú (activar/desactivar comidas)
**UX → Views → + New View**:
- For this data: **Comidas**, view type **table** o **deck**, agrupada por `Tipo`.
- Permite editar `Incluir` (toggle) y `Acompanamiento`.
- Al cambiar `Incluir` y **Sync**, la vista de compra se recalcula automáticamente.

### 2.8 Acompañamiento del salmorejo (elegible)
- En **Comidas**, la fila `Salmorejo con acompanamiento` tiene la columna `Acompanamiento`.
- Conviértela en **Enum** con valores:
  `Filetes de ternera`, `Lomo de cerdo`, `Pechuga de pollo`, `Flamenquines`.
- Para que el acompañamiento elegido cambie el ingrediente comprado, la vía sencilla es
  tener en `Recetas` una línea por cada opción y filtrar por la elegida. Alternativa
  simple: dejar la línea `Filetes de ternera` por defecto y, si cambias de opción, ajustar
  esa línea en `Recetas`. (Documentado en `docs/RECETAS.md`.)

---

## 3) Publicar y compartir
1. **Manage → Deploy → Deployment check** y corrige avisos.
2. **Not deployed → Move app to deployed**.
3. Comparte con los comensales por email o enlace (Users). La app es privada de tu cuenta
   hasta que la compartas.

---

## Notas
- **AppSheet no tiene API pública para crear la app automáticamente**: los pasos anteriores
  se hacen una vez en el editor de AppSheet. El Google Sheet y los datos sí están listos.
- Si prefieres no usar el nivel avanzado, el flujo local con `generar_lista.py` + nivel
  básico cubre el 100% de la necesidad.
