# Modelo de datos

El backend es un **Google Sheet** con una pestaña por tabla. Los CSV de `data/` tienen
exactamente la misma estructura (la cabecera es la fila 1).

## Diagrama de relaciones

```
Config (parámetros globales)
   Adultos, Niños, FactorNiño

Comidas ────< Recetas >──── Ingredientes
(1 comida)   (N líneas)     (1 ingrediente)

ListaCompra  = agregación de Recetas (de las comidas incluidas) por Ingrediente
```

- Una **Comida** tiene muchas líneas de **Receta**.
- Un **Ingrediente** aparece en muchas líneas de **Receta**.
- **Recetas** es la tabla puente (N:M) entre Comidas e Ingredientes.

---

## Tablas

### `Config`  — parámetros globales
| Columna | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| Clave | Text (clave) | `Adultos` | Nombre del parámetro |
| Valor | Number | `14` | Valor |
| Descripcion | Text | | Texto de ayuda |

Filas: `Adultos=14`, `Ninos=3`, `FactorNino=0.5`.

### `Comidas`  — el menú
| Columna | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| Comida | Text (clave) | `Arroz campero` | Nombre del plato |
| Tipo | Enum | `Almuerzo` / `Cena` | Momento de la comida |
| Incluir | Enum (`Si`/`No`) | `Si` | Si se cuenta en la lista |
| Acompanamiento | Text | `Filetes de ternera` | Solo para el salmorejo |
| Notas | Text | | Observaciones |

### `Ingredientes`  — catálogo
| Columna | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| Ingrediente | Text (clave) | `Cebolla` | Nombre |
| Categoria | Enum | `Fruteria` | Sección del súper |
| Unidad | Enum | `g` / `ml` / `ud` | Unidad base |

Categorías: `Fruteria, Carniceria, Charcuteria, Pescaderia, Panaderia, Lacteos, Congelados, Despensa, Bebidas`.

### `Recetas`  — líneas de receta (tabla puente)
| Columna | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| Comida | Ref → Comidas | `Arroz campero` | Plato al que pertenece |
| Ingrediente | Ref → Ingredientes | `Arroz` | Ingrediente |
| CantidadPorRacion | Number | `100` | Cantidad **por ración adulta**, en la unidad base del ingrediente |

> Clave de fila: AppSheet puede usar una columna `RecetaID` o la combinación
> `Comida+Ingrediente`. Al importar el CSV, añade una columna clave si lo prefieres
> (ver guía de AppSheet).

### `ListaCompra`  — salida consolidada
| Columna | Tipo | Descripción |
|---|---|---|
| Categoria | Enum | Sección del súper |
| Ingrediente | Text (clave) | Ingrediente |
| Cantidad | Number | Total en unidad base |
| Unidad | Text | `g` / `ml` / `ud` |
| CantidadLegible | Text | Total formateado (kg / L / ud) |
| Comprado | Enum (`Si`/`No`) | Marcado en el súper |
| Notas | Text | Observaciones |

En el **nivel avanzado** de AppSheet, `ListaCompra` no es una tabla física sino la propia
tabla `Ingredientes` con columnas virtuales (ver la guía). En el **nivel básico** es la
pestaña `ListaCompra` generada por `scripts/generar_lista.py`.

---

## Unidades

Todo se guarda en **unidad base**: `g`, `ml`, `ud`. La conversión a kg/L es solo de
presentación (columna `CantidadLegible`). Así se evitan errores al sumar.
