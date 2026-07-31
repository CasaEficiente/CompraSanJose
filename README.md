# CompraSanJose 🛒

Aplicación **AppSheet + Google Sheets** para gestionar la **lista de la compra** de una
comida en grupo: **14 adultos y 3 niños**.

El proyecto contiene:

- **El modelo de datos** (comidas → recetas → ingredientes) como fuente única de verdad.
- **Un motor de cálculo** que consolida la lista de la compra escalada a los comensales.
- **La guía paso a paso** para montar la app en AppSheet sobre un Google Sheet.

---

## 🍽️ Menú

Cada comida se puede **activar o desactivar** (columna `Incluir`) para recalcular la lista.

### Almuerzos
| Comida | Notas |
|---|---|
| Arroz campero | |
| Mousaka griega | |
| Couscous | |
| Plato alpujarreño con huevos fritos | |
| Salmorejo con acompañamiento | Acompañamiento **elegible en la app** (por defecto filetes de ternera) |
| Migas | |
| Chili con carne | Con guarnición de arroz |
| Asado de pollo y patatas | |
| Pisto de verduras con huevos fritos | **Opción de respaldo** — solo cebolla, tomate frito y pimiento verde |

### Cenas
| Comida | Notas |
|---|---|
| Barbacoa 1 | Cerdo y embutido |
| Barbacoa 2 | Vacuno, pollo y verdura a la brasa |
| Fajitas | |
| Hamburguesas | |
| Pizzas | |
| Fritura de pescado | |

---

## 🧮 Cómo se calcula la lista

```
raciones = Adultos + Niños × FactorNiño          (14 + 3 × 0,5 = 15,5)
total_ingrediente = Σ (CantidadPorRacion × raciones)   sobre las comidas con Incluir = Sí
```

Las cantidades de cada receta están expresadas **por ración adulta** en unidad base
(`g`, `ml`, `ud`). Un niño equivale a `FactorNiño` raciones (0,5 por defecto, configurable
en `data/Config.csv`).

---

## 📂 Estructura del repositorio

```
CompraSanJose/
├── data/                     ← fuente de datos (se importa a Google Sheets)
│   ├── Config.csv            parámetros: Adultos, Niños, FactorNiño
│   ├── Comidas.csv           menú, tipo (Almuerzo/Cena) e inclusión
│   ├── Ingredientes.csv      catálogo: categoría + unidad
│   ├── Recetas.csv           cantidades por ración de cada ingrediente
│   └── ListaCompra.csv       ← GENERADA: lista consolidada para la compra
├── scripts/
│   ├── seed_data.py          regenera los CSV base desde el modelo maestro
│   └── generar_lista.py      recalcula data/ListaCompra.csv desde los CSV
└── docs/
    ├── APPSHEET_SETUP.md     guía para montar la app en AppSheet
    ├── MODELO_DATOS.md       descripción de tablas y relaciones
    └── RECETAS.md            cantidades por ración de cada plato
```

---

## 🚀 Uso rápido (recalcular en local)

Requisitos: **Python 3** (sin dependencias externas).

```bash
# 1) (Opcional) Ajusta comensales o el menú editando los CSV de data/
#    p.ej. pon Incluir = No en una comida que no vayas a hacer.

# 2) Recalcula la lista de la compra:
python scripts/generar_lista.py
```

Se actualiza `data/ListaCompra.csv` y se imprime el resumen agrupado por categoría de
supermercado (Frutería, Carnicería, Charcutería, Pescadería, Panadería, Lácteos,
Congelados, Despensa, Bebidas).

Para regenerar los CSV base desde cero: `python scripts/seed_data.py`.

---

## 📱 App AppSheet

La app se conecta a un **Google Sheet** (en la cuenta de Google/Gmail) con las mismas
tablas que los CSV. Sigue **[docs/APPSHEET_SETUP.md](docs/APPSHEET_SETUP.md)**.

Ofrece dos niveles:

1. **Nivel básico** — una sola tabla (`ListaCompra`) como checklist de compra en el móvil,
   con marcado de "Comprado" y agrupación por categoría. Listo en minutos.
2. **Nivel avanzado** — modelo relacional completo con columnas virtuales que **recalculan
   la lista dentro de la app** al activar/desactivar comidas o cambiar el acompañamiento.

---

## 🔁 Flujo recomendado

1. Editas el menú o los comensales (en el Sheet o en los CSV).
2. La lista se recalcula (columnas virtuales de AppSheet, o `generar_lista.py` en local).
3. En el súper, marcas cada ingrediente como comprado desde el móvil.
