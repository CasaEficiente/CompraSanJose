# -*- coding: utf-8 -*-
"""
Genera los CSV base del proyecto (fuente de datos para el Google Sheet / AppSheet).

Ejecuta:  python scripts/seed_data.py

Escribe en data/:
  - Config.csv        parametros globales (comensales, factor nino)
  - Comidas.csv       lista de comidas, tipo (Almuerzo/Cena) e inclusion
  - Ingredientes.csv  catalogo de ingredientes (categoria + unidad base)
  - Recetas.csv       lineas de receta: cantidad por racion (adulta) de cada ingrediente

Las cantidades estan expresadas POR RACION ADULTA en unidad base:
  g  = gramos, ml = mililitros, ud = unidades

Un nino cuenta como FactorNino raciones (0,5 por defecto).
"""
import csv
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, "data")
os.makedirs(DATA, exist_ok=True)

# ---------------------------------------------------------------------------
# 1) CONFIG
# ---------------------------------------------------------------------------
CONFIG = [
    ("Adultos", "14", "Numero de comensales adultos"),
    ("Ninos", "3", "Numero de comensales ninos"),
    ("FactorNino", "0.5", "Racion equivalente de un nino respecto a un adulto"),
]

# ---------------------------------------------------------------------------
# 2) COMIDAS   (Comida, Tipo, Incluir, Acompanamiento, Notas)
#    Incluir = Si/No  -> permite activar/desactivar una comida y recalcular.
# ---------------------------------------------------------------------------
COMIDAS = [
    ("Arroz campero",                    "Almuerzo", "Si", "", ""),
    ("Mousaka griega",                   "Almuerzo", "Si", "", ""),
    ("Couscous",                         "Almuerzo", "Si", "", ""),
    ("Plato alpujarreno con huevos",     "Almuerzo", "Si", "", "Con huevos fritos"),
    ("Salmorejo con acompanamiento",     "Almuerzo", "Si", "Filetes de ternera",
        "Acompanamiento elegible: Filetes de ternera / Lomo de cerdo / Pechuga de pollo / Flamenquines"),
    ("Migas",                            "Almuerzo", "Si", "", ""),
    ("Chili con carne",                  "Almuerzo", "Si", "", "Con guarnicion de arroz"),
    ("Asado de pollo y patatas",         "Almuerzo", "Si", "", ""),
    ("Pisto de verduras con huevos",     "Almuerzo", "Si", "", "OPCION DE RESPALDO (cebolla, tomate frito y pimiento verde + huevos fritos)"),
    ("Barbacoa 1",                       "Cena",     "Si", "", "Cerdo y embutido"),
    ("Barbacoa 2",                       "Cena",     "Si", "", "Vacuno, pollo y verdura a la brasa"),
    ("Fajitas",                          "Cena",     "Si", "", ""),
    ("Hamburguesas",                     "Cena",     "Si", "", ""),
    ("Pizzas",                           "Cena",     "Si", "", ""),
    ("Fritura de pescado",               "Cena",     "Si", "", ""),
]

# ---------------------------------------------------------------------------
# 3) INGREDIENTES   (Ingrediente, Categoria, Unidad)
# ---------------------------------------------------------------------------
INGREDIENTES = [
    # --- Carniceria / Charcuteria ---
    ("Pollo troceado",              "Carniceria",  "g"),
    ("Pollo en tiras",              "Carniceria",  "g"),
    ("Alitas de pollo",             "Carniceria",  "g"),
    ("Carne picada mixta",          "Carniceria",  "g"),
    ("Carne picada de ternera",     "Carniceria",  "g"),
    ("Filetes de ternera",          "Carniceria",  "g"),
    ("Entrecot de vaca",            "Carniceria",  "g"),
    ("Costillas de cerdo",          "Carniceria",  "g"),
    ("Lomo de cerdo",               "Carniceria",  "g"),
    ("Pinchos morunos",             "Carniceria",  "g"),
    ("Chorizo",                     "Charcuteria", "g"),
    ("Chorizo parrilla",            "Charcuteria", "g"),
    ("Morcilla",                    "Charcuteria", "g"),
    ("Longaniza",                   "Charcuteria", "g"),
    ("Panceta",                     "Charcuteria", "g"),
    ("Bacon",                       "Charcuteria", "g"),
    ("Salchichas",                  "Charcuteria", "g"),
    ("Chistorra",                   "Charcuteria", "g"),
    ("Jamon serrano",               "Charcuteria", "g"),
    ("Jamon cocido",                "Charcuteria", "g"),
    ("Salami/pepperoni",            "Charcuteria", "g"),
    # --- Pescaderia ---
    ("Pescado variado para freir",  "Pescaderia",  "g"),
    # --- Fruteria / Verduleria ---
    ("Berenjena",                   "Fruteria",    "g"),
    ("Patata",                      "Fruteria",    "g"),
    ("Cebolla",                     "Fruteria",    "g"),
    ("Cebolleta",                   "Fruteria",    "g"),
    ("Pimiento rojo",               "Fruteria",    "g"),
    ("Pimiento verde",              "Fruteria",    "g"),
    ("Zanahoria",                   "Fruteria",    "g"),
    ("Calabacin",                   "Fruteria",    "g"),
    ("Tomate",                      "Fruteria",    "g"),
    ("Tomate maduro",               "Fruteria",    "g"),
    ("Ajo",                         "Fruteria",    "g"),
    ("Champinones",                 "Fruteria",    "g"),
    ("Lechuga",                     "Fruteria",    "g"),
    ("Limon",                       "Fruteria",    "ud"),
    ("Maiz mazorca",                "Fruteria",    "ud"),
    ("Perejil",                     "Fruteria",    "g"),
    # --- Panaderia ---
    ("Pan",                         "Panaderia",   "g"),
    ("Pan del dia anterior",        "Panaderia",   "g"),
    ("Pan de hamburguesa",          "Panaderia",   "ud"),
    ("Masa de pizza",               "Panaderia",   "g"),
    ("Tortillas de trigo",          "Panaderia",   "ud"),
    # --- Lacteos y huevos ---
    ("Leche",                       "Lacteos",     "ml"),
    ("Mantequilla",                 "Lacteos",     "g"),
    ("Queso rallado",               "Lacteos",     "g"),
    ("Mozzarella",                  "Lacteos",     "g"),
    ("Queso en lonchas",            "Lacteos",     "g"),
    ("Nata agria",                  "Lacteos",     "g"),
    ("Huevo",                       "Lacteos",     "ud"),
    # --- Despensa ---
    ("Arroz",                       "Despensa",    "g"),
    ("Semola couscous",             "Despensa",    "g"),
    ("Garbanzos cocidos",           "Despensa",    "g"),
    ("Alubias rojas cocidas",       "Despensa",    "g"),
    ("Maiz dulce",                  "Despensa",    "g"),
    ("Pasas",                       "Despensa",    "g"),
    ("Harina",                      "Despensa",    "g"),
    ("Harina de freir",             "Despensa",    "g"),
    ("Caldo de pollo",              "Despensa",    "ml"),
    ("Caldo de carne",              "Despensa",    "ml"),
    ("Tomate triturado",            "Despensa",    "g"),
    ("Tomate frito",                "Despensa",    "g"),
    ("Aceite de oliva",             "Despensa",    "ml"),
    ("Aceite de oliva virgen extra","Despensa",    "ml"),
    ("Aceite de girasol",           "Despensa",    "ml"),
    ("Vinagre",                     "Despensa",    "ml"),
    ("Pimenton",                    "Despensa",    "g"),
    ("Pimenton picante",            "Despensa",    "g"),
    ("Comino",                      "Despensa",    "g"),
    ("Canela",                      "Despensa",    "g"),
    ("Nuez moscada",                "Despensa",    "g"),
    ("Ras el hanout",               "Despensa",    "g"),
    ("Especias fajita",             "Despensa",    "g"),
    ("Oregano",                     "Despensa",    "g"),
    ("Romero",                      "Despensa",    "g"),
    ("Sal",                         "Despensa",    "g"),
    ("Sal gorda",                   "Despensa",    "g"),
    ("Aceitunas negras",            "Despensa",    "g"),
    ("Pepinillos",                  "Despensa",    "g"),
    ("Ketchup",                     "Despensa",    "g"),
    ("Mostaza",                     "Despensa",    "g"),
    ("Mayonesa",                    "Despensa",    "g"),
    ("Alioli",                      "Despensa",    "g"),
    ("Chimichurri",                 "Despensa",    "g"),
    ("Guacamole",                   "Despensa",    "g"),
    # --- Bebidas ---
    ("Vino tinto",                  "Bebidas",     "ml"),
    ("Vino blanco",                 "Bebidas",     "ml"),
    # --- Congelados ---
    ("Guisantes",                   "Congelados",  "g"),
    ("Patatas congeladas",          "Congelados",  "g"),
]

# ---------------------------------------------------------------------------
# 4) RECETAS   (Comida, Ingrediente, CantidadPorRacion)  -- por racion adulta
# ---------------------------------------------------------------------------
RECETAS = [
    # --- Arroz campero ---
    ("Arroz campero", "Arroz", 100),
    ("Arroz campero", "Pollo troceado", 150),
    ("Arroz campero", "Chorizo", 30),
    ("Arroz campero", "Pimiento rojo", 40),
    ("Arroz campero", "Pimiento verde", 40),
    ("Arroz campero", "Cebolla", 40),
    ("Arroz campero", "Tomate triturado", 50),
    ("Arroz campero", "Guisantes", 30),
    ("Arroz campero", "Ajo", 3),
    ("Arroz campero", "Caldo de pollo", 250),
    ("Arroz campero", "Aceite de oliva", 15),
    ("Arroz campero", "Pimenton", 2),
    ("Arroz campero", "Sal", 2),
    # --- Mousaka griega ---
    ("Mousaka griega", "Berenjena", 200),
    ("Mousaka griega", "Patata", 100),
    ("Mousaka griega", "Carne picada mixta", 150),
    ("Mousaka griega", "Cebolla", 50),
    ("Mousaka griega", "Tomate triturado", 100),
    ("Mousaka griega", "Ajo", 3),
    ("Mousaka griega", "Vino tinto", 20),
    ("Mousaka griega", "Leche", 150),
    ("Mousaka griega", "Mantequilla", 15),
    ("Mousaka griega", "Harina", 15),
    ("Mousaka griega", "Queso rallado", 25),
    ("Mousaka griega", "Huevo", 0.25),
    ("Mousaka griega", "Aceite de oliva", 20),
    ("Mousaka griega", "Canela", 0.5),
    ("Mousaka griega", "Nuez moscada", 0.2),
    ("Mousaka griega", "Sal", 2),
    # --- Couscous ---
    ("Couscous", "Semola couscous", 90),
    ("Couscous", "Pollo troceado", 150),
    ("Couscous", "Cebolla", 60),
    ("Couscous", "Zanahoria", 60),
    ("Couscous", "Calabacin", 60),
    ("Couscous", "Garbanzos cocidos", 50),
    ("Couscous", "Tomate triturado", 50),
    ("Couscous", "Pimiento rojo", 40),
    ("Couscous", "Pasas", 15),
    ("Couscous", "Caldo de pollo", 150),
    ("Couscous", "Aceite de oliva", 15),
    ("Couscous", "Ras el hanout", 3),
    ("Couscous", "Sal", 2),
    # --- Plato alpujarreno con huevos ---
    ("Plato alpujarreno con huevos", "Patata", 200),
    ("Plato alpujarreno con huevos", "Morcilla", 50),
    ("Plato alpujarreno con huevos", "Chorizo", 50),
    ("Plato alpujarreno con huevos", "Longaniza", 50),
    ("Plato alpujarreno con huevos", "Lomo de cerdo", 80),
    ("Plato alpujarreno con huevos", "Jamon serrano", 20),
    ("Plato alpujarreno con huevos", "Huevo", 1.5),
    ("Plato alpujarreno con huevos", "Pimiento verde", 40),
    ("Plato alpujarreno con huevos", "Aceite de oliva", 30),
    ("Plato alpujarreno con huevos", "Sal", 2),
    # --- Salmorejo con acompanamiento ---
    ("Salmorejo con acompanamiento", "Tomate maduro", 250),
    ("Salmorejo con acompanamiento", "Pan", 60),
    ("Salmorejo con acompanamiento", "Ajo", 3),
    ("Salmorejo con acompanamiento", "Aceite de oliva virgen extra", 40),
    ("Salmorejo con acompanamiento", "Vinagre", 5),
    ("Salmorejo con acompanamiento", "Sal", 3),
    ("Salmorejo con acompanamiento", "Huevo", 0.5),
    ("Salmorejo con acompanamiento", "Jamon serrano", 15),
    ("Salmorejo con acompanamiento", "Filetes de ternera", 180),
    # --- Migas ---
    ("Migas", "Pan del dia anterior", 120),
    ("Migas", "Chorizo", 40),
    ("Migas", "Panceta", 40),
    ("Migas", "Ajo", 5),
    ("Migas", "Pimiento verde", 30),
    ("Migas", "Aceite de oliva", 25),
    ("Migas", "Pimenton", 2),
    ("Migas", "Sal", 2),
    # --- Chili con carne ---
    ("Chili con carne", "Carne picada de ternera", 150),
    ("Chili con carne", "Alubias rojas cocidas", 80),
    ("Chili con carne", "Cebolla", 60),
    ("Chili con carne", "Pimiento rojo", 50),
    ("Chili con carne", "Tomate triturado", 120),
    ("Chili con carne", "Ajo", 3),
    ("Chili con carne", "Maiz dulce", 30),
    ("Chili con carne", "Comino", 2),
    ("Chili con carne", "Pimenton picante", 1),
    ("Chili con carne", "Caldo de carne", 50),
    ("Chili con carne", "Aceite de oliva", 15),
    ("Chili con carne", "Arroz", 60),
    ("Chili con carne", "Sal", 2),
    # --- Asado de pollo y patatas ---
    ("Asado de pollo y patatas", "Pollo troceado", 350),
    ("Asado de pollo y patatas", "Patata", 250),
    ("Asado de pollo y patatas", "Cebolla", 80),
    ("Asado de pollo y patatas", "Ajo", 5),
    ("Asado de pollo y patatas", "Limon", 0.25),
    ("Asado de pollo y patatas", "Vino blanco", 30),
    ("Asado de pollo y patatas", "Aceite de oliva", 20),
    ("Asado de pollo y patatas", "Romero", 0.5),
    ("Asado de pollo y patatas", "Sal", 3),
    # --- Pisto de verduras con huevos (respaldo) ---
    ("Pisto de verduras con huevos", "Cebolla", 100),
    ("Pisto de verduras con huevos", "Pimiento verde", 100),
    ("Pisto de verduras con huevos", "Tomate frito", 120),
    ("Pisto de verduras con huevos", "Huevo", 1.5),
    ("Pisto de verduras con huevos", "Aceite de oliva", 25),
    ("Pisto de verduras con huevos", "Sal", 2),
    # --- Barbacoa 1 ---
    ("Barbacoa 1", "Costillas de cerdo", 150),
    ("Barbacoa 1", "Chorizo parrilla", 60),
    ("Barbacoa 1", "Morcilla", 40),
    ("Barbacoa 1", "Panceta", 60),
    ("Barbacoa 1", "Salchichas", 80),
    ("Barbacoa 1", "Pinchos morunos", 100),
    ("Barbacoa 1", "Pan", 80),
    ("Barbacoa 1", "Pimiento verde", 50),
    ("Barbacoa 1", "Sal gorda", 3),
    ("Barbacoa 1", "Alioli", 20),
    # --- Barbacoa 2 ---
    ("Barbacoa 2", "Entrecot de vaca", 180),
    ("Barbacoa 2", "Alitas de pollo", 120),
    ("Barbacoa 2", "Chorizo parrilla", 50),
    ("Barbacoa 2", "Chistorra", 40),
    ("Barbacoa 2", "Calabacin", 60),
    ("Barbacoa 2", "Cebolleta", 40),
    ("Barbacoa 2", "Pimiento rojo", 40),
    ("Barbacoa 2", "Maiz mazorca", 0.5),
    ("Barbacoa 2", "Pan", 80),
    ("Barbacoa 2", "Sal gorda", 3),
    ("Barbacoa 2", "Chimichurri", 20),
    # --- Fajitas ---
    ("Fajitas", "Pollo en tiras", 150),
    ("Fajitas", "Tortillas de trigo", 2),
    ("Fajitas", "Pimiento rojo", 50),
    ("Fajitas", "Pimiento verde", 50),
    ("Fajitas", "Cebolla", 60),
    ("Fajitas", "Queso rallado", 30),
    ("Fajitas", "Nata agria", 30),
    ("Fajitas", "Tomate", 40),
    ("Fajitas", "Lechuga", 30),
    ("Fajitas", "Especias fajita", 3),
    ("Fajitas", "Aceite de oliva", 10),
    ("Fajitas", "Guacamole", 30),
    # --- Hamburguesas ---
    ("Hamburguesas", "Carne picada de ternera", 180),
    ("Hamburguesas", "Pan de hamburguesa", 1.5),
    ("Hamburguesas", "Queso en lonchas", 20),
    ("Hamburguesas", "Lechuga", 20),
    ("Hamburguesas", "Tomate", 40),
    ("Hamburguesas", "Cebolla", 30),
    ("Hamburguesas", "Bacon", 30),
    ("Hamburguesas", "Pepinillos", 15),
    ("Hamburguesas", "Ketchup", 10),
    ("Hamburguesas", "Mostaza", 5),
    ("Hamburguesas", "Mayonesa", 10),
    ("Hamburguesas", "Patatas congeladas", 150),
    # --- Pizzas ---
    ("Pizzas", "Masa de pizza", 150),
    ("Pizzas", "Tomate triturado", 60),
    ("Pizzas", "Mozzarella", 80),
    ("Pizzas", "Jamon cocido", 30),
    ("Pizzas", "Salami/pepperoni", 25),
    ("Pizzas", "Champinones", 30),
    ("Pizzas", "Pimiento rojo", 20),
    ("Pizzas", "Aceitunas negras", 15),
    ("Pizzas", "Oregano", 1),
    ("Pizzas", "Aceite de oliva", 5),
    # --- Fritura de pescado ---
    ("Fritura de pescado", "Pescado variado para freir", 300),
    ("Fritura de pescado", "Harina de freir", 60),
    ("Fritura de pescado", "Aceite de girasol", 80),
    ("Fritura de pescado", "Limon", 0.5),
    ("Fritura de pescado", "Sal", 2),
    ("Fritura de pescado", "Perejil", 1),
]


def fnum(x):
    """Formatea numeros sin decimales innecesarios."""
    if isinstance(x, float) and x.is_integer():
        return str(int(x))
    return str(x)


def write_csv(path, header, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in rows:
            w.writerow([fnum(c) for c in r])
    print("  escrito:", os.path.relpath(path, BASE), "(%d filas)" % len(rows))


def validate():
    ing_names = {i[0] for i in INGREDIENTES}
    comida_names = {c[0] for c in COMIDAS}
    errores = []
    for comida, ing, _ in RECETAS:
        if comida not in comida_names:
            errores.append("Receta usa comida inexistente: %r" % comida)
        if ing not in ing_names:
            errores.append("Receta usa ingrediente fuera del catalogo: %r" % ing)
    if errores:
        raise SystemExit("ERRORES DE CONSISTENCIA:\n  " + "\n  ".join(sorted(set(errores))))


def main():
    print("Generando CSV base en", DATA)
    validate()
    write_csv(os.path.join(DATA, "Config.csv"),
              ["Clave", "Valor", "Descripcion"], CONFIG)
    write_csv(os.path.join(DATA, "Comidas.csv"),
              ["Comida", "Tipo", "Incluir", "Acompanamiento", "Notas"], COMIDAS)
    write_csv(os.path.join(DATA, "Ingredientes.csv"),
              ["Ingrediente", "Categoria", "Unidad"], INGREDIENTES)
    write_csv(os.path.join(DATA, "Recetas.csv"),
              ["Comida", "Ingrediente", "CantidadPorRacion"], RECETAS)
    print("OK. %d comidas, %d ingredientes, %d lineas de receta."
          % (len(COMIDAS), len(INGREDIENTES), len(RECETAS)))


if __name__ == "__main__":
    main()
