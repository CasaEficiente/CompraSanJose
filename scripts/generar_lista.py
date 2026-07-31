# -*- coding: utf-8 -*-
"""
Calcula la lista de la compra consolidada a partir de los CSV de data/.

Ejecuta:  python scripts/generar_lista.py

Lee:   data/Config.csv, data/Comidas.csv, data/Ingredientes.csv, data/Recetas.csv
Escribe: data/ListaCompra.csv   (agregada por ingrediente, con columna Comprado)

Formula:
    raciones = Adultos + Ninos * FactorNino
    total_ingrediente = SUM( CantidadPorRacion * raciones )   sobre comidas con Incluir = Si
"""
import csv
import os
import math

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, "data")

# Orden logico de las categorias en el supermercado.
ORDEN_CATEGORIA = [
    "Fruteria", "Carniceria", "Charcuteria", "Pescaderia",
    "Panaderia", "Lacteos", "Congelados", "Despensa", "Bebidas",
]


def read_csv(name):
    path = os.path.join(DATA, name)
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def to_float(s):
    return float(str(s).replace(",", ".").strip())


def display(cant, unidad):
    """Cantidad legible: convierte g->kg y ml->L cuando es grande."""
    if unidad == "g" and cant >= 1000:
        return "%s kg" % _fmt(cant / 1000.0)
    if unidad == "ml" and cant >= 1000:
        return "%s L" % _fmt(cant / 1000.0)
    if unidad == "ud":
        return "%s ud" % _fmt(math.ceil(cant))
    return "%s %s" % (_fmt(cant), unidad)


def _fmt(x):
    if abs(x - round(x)) < 1e-9:
        return str(int(round(x)))
    return ("%.2f" % x).rstrip("0").rstrip(".").replace(".", ",")


def main():
    cfg = {r["Clave"]: r["Valor"] for r in read_csv("Config.csv")}
    adultos = to_float(cfg["Adultos"])
    ninos = to_float(cfg["Ninos"])
    factor = to_float(cfg["FactorNino"])
    raciones = adultos + ninos * factor

    comidas = read_csv("Comidas.csv")
    incluidas = {c["Comida"] for c in comidas
                 if c["Incluir"].strip().lower() in ("si", "sí", "true", "x", "1")}

    ing_cat = {}
    ing_unidad = {}
    for r in read_csv("Ingredientes.csv"):
        ing_cat[r["Ingrediente"]] = r["Categoria"]
        ing_unidad[r["Ingrediente"]] = r["Unidad"]

    totales = {}  # ingrediente -> cantidad total
    for r in read_csv("Recetas.csv"):
        if r["Comida"] not in incluidas:
            continue
        ing = r["Ingrediente"]
        totales[ing] = totales.get(ing, 0.0) + to_float(r["CantidadPorRacion"]) * raciones

    filas = []
    for ing, cant in totales.items():
        cat = ing_cat.get(ing, "Despensa")
        uni = ing_unidad.get(ing, "g")
        filas.append({
            "Categoria": cat,
            "Ingrediente": ing,
            "Cantidad": _fmt(round(cant, 1)),
            "Unidad": uni,
            "CantidadLegible": display(cant, uni),
            "Comprado": "No",
            "Notas": "",
        })

    def clave(f):
        cat = f["Categoria"]
        idx = ORDEN_CATEGORIA.index(cat) if cat in ORDEN_CATEGORIA else len(ORDEN_CATEGORIA)
        return (idx, f["Ingrediente"].lower())

    filas.sort(key=clave)

    out = os.path.join(DATA, "ListaCompra.csv")
    campos = ["Categoria", "Ingrediente", "Cantidad", "Unidad",
              "CantidadLegible", "Comprado", "Notas"]
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=campos)
        w.writeheader()
        for row in filas:
            w.writerow(row)

    # Resumen por pantalla
    print("Comensales: %g adultos + %g ninos  ->  %g raciones (FactorNino=%g)"
          % (adultos, ninos, raciones, factor))
    print("Comidas incluidas: %d de %d" % (len(incluidas), len(comidas)))
    print("Ingredientes en la lista: %d" % len(filas))
    print("Escrito:", os.path.relpath(out, BASE))
    print()
    cat_actual = None
    for f in filas:
        if f["Categoria"] != cat_actual:
            cat_actual = f["Categoria"]
            print("== %s ==" % cat_actual)
        print("  %-32s %s" % (f["Ingrediente"], f["CantidadLegible"]))


if __name__ == "__main__":
    main()
