# Montaje de la app SanJose2026 (AppSheet) — guía definitiva

Backend: **un único Google Sheet** con 11 pestañas (`CompraSanJose.xlsx`).
App: **SanJose2026** (ya creada en tu cuenta).

> No existe API para construir la app por código: estos pasos se hacen una vez en el editor
> de AppSheet. El Google Sheet y los datos ya están listos y calculados.

---

## PARTE A · Subir el backend y conectarlo (5 min)

1. **Sube el libro a Drive.** El archivo está en tu equipo:
   `C:\Users\franc\source\repos\CompraSanJose\data\CompraSanJose.xlsx`
   - Ve a **drive.google.com** → carpeta **CompraSanJose** → **Nuevo → Subir archivo** → elige ese `.xlsx`.
2. **Conviértelo a Google Sheet.** Doble clic en el archivo subido → **Abrir con Hojas de cálculo de Google** → **Archivo → Guardar como Hojas de cálculo de Google**. Tendrás un libro **CompraSanJose** con 11 pestañas: `Config, Comidas, Ingredientes, Recetas, Calendario, Compras, Despensa, Basicos, ListasAbiertas, Usuarios, ListaCompra`.
3. **Conéctalo a la app.** Abre **SanJose2026** en AppSheet → **Data (izquierda) → + → Add data → Google Sheets** → elige el libro **CompraSanJose** → añade **todas** las pestañas como tablas.

Con esto AppSheet autogenera una app navegable. Lo siguiente la afina.

---

## PARTE B · Tipos de columna y claves (Data → Columns)

| Tabla | Ajustes clave |
|---|---|
| **Config** | `Clave` = Key/Label · `Valor` = Number |
| **Comidas** | `Comida` = Key/Label · `Preparacion` = **LongText** · `MomentoSugerido`,`Cocinero` = Enum · añade `Foto` = **Image** |
| **Ingredientes** | `Ingrediente` = Key/Label · `Categoria` = Enum · `Unidad` = Enum · `EsBasico` = Enum(Si/No) · añade `Foto` = Image |
| **Recetas** | añade columna clave `RecetaID` (en el Sheet: `=Comida&" · "&Ingrediente`) · `Comida` = **Ref→Comidas** · `Ingrediente` = **Ref→Ingredientes** · `CantidadPorComensal`,`PesoEnGrupo` = Number · `Grupo` = Enum · `Opcional` = Enum(Si/No) |
| **Calendario** | `Fecha` = Date · `Momento` = Enum(Almuerzo,Cena) · `Comida` = **Ref→Comidas** · `Cocinero` = Enum · `NivelCarne` = Enum(Estandar,Reducido) |
| **Compras** | `Fecha` = **Date/Key** |
| **Despensa** | `Ingrediente` = Ref→Ingredientes · `Cantidad` = Number |
| **Basicos** | `Item` = Key · `Lista` = Enum(Cocina,Bebidas,Picoteo) · `Comprado` = **Yes/No** |
| **ListasAbiertas** | añade clave `ItemID` (`=Tipo&" · "&Item`) · `Tipo` = Enum(Desayuno,Bebidas,Picoteo) · `Paquetes` = Number · `Comprado` = **Yes/No** |
| **Usuarios** | `Email` = Key |
| **ListaCompra** | `Ingrediente` = Key · `Categoria` = Enum · `Comprado` = **Yes/No** |

---

## PARTE C · Vistas principales (UX → Views)

1. **Comprar** (inicio) — datos `ListaCompra`, tipo **deck**, **Group by** `Categoria`, muestra
   `Ingrediente`, `CantidadLegible`, toggle `Comprado`. Format rule: si `Comprado` → atenuar/tachar.
2. **Calendario** — datos `Calendario`, tipo **table** o **calendar**, agrupado por `Fecha`; columnas
   `Momento`,`Comida`,`Cocinero`. Editable por todos.
3. **Recetas** — datos `Comidas`, tipo **deck** con `Foto`; al abrir, un *inline* de `Recetas`
   (ingredientes con cantidades) + `Preparacion`.
4. **Despensa** — datos `Despensa`.
5. **Básicos / Desayuno / Bebidas / Picoteo** — datos `Basicos` y `ListasAbiertas`, agrupados por
   `Lista`/`Tipo`, con toggle `Comprado` y `Paquetes`.
6. **Ajustes** — datos `Config` (comensales, días) + `Usuarios` + `Compras`.

---

## PARTE D · Lógica (columnas virtuales)

**Raciones** (Recetas, Number):
```
( ANY(SELECT(Config[Valor],[Clave]="AdultosM")) + ANY(SELECT(Config[Valor],[Clave]="AdultosF")) )
+ ANY(SELECT(Config[Valor],[Clave]="Ninos")) * ANY(SELECT(Config[Valor],[Clave]="FactorNino"))
```

**Cantidad escalada** (Recetas VC `Cantidad`, Number): `[CantidadPorComensal] * [Raciones]`
(los ingredientes con `EsBasico=Si` no se piden aquí: van en la hoja **Basicos**).

**Barbacoa — objetivo y pendiente por asignar** (RF-26).
En **Comidas** (o por instancia del calendario), VC `ObjetivoCarne` (Number):
```
IF([NivelCarne]="Reducido",
   nMasc*g_M_red + nFem*g_F_red + nNino*g_Nino,
   nMasc*g_M     + nFem*g_F     + nNino*g_Nino)
```
(sustituye `nMasc,...` por los `ANY(SELECT(Config...))` y `g_M` por `BBQ_g_M`, etc.)
VC `CarneAsignada` = `SUM(SELECT(Recetas[Cantidad],AND([Comida]=[_THISROW].[Comida],[Grupo]="Carne")))`
VC **`PendientePorAsignar`** = `[ObjetivoCarne] - [CarneAsignada]`  → debe tender a **0**.
Format rule: verde si `=0`, ámbar si `>0`, rojo si `<0` (te has pasado).

**Lista de la compra unificada** (regla de negocio, RF-08/14/15):
- Se **compra** lo que está **sin marcar**; lo **marcado** cuenta como **despensa/ya lo tenemos**.
- La compra = `ListaCompra`(Comprado=No) + `Basicos`(Comprado=No) + `ListasAbiertas`(Comprado=No),
  **menos** lo de `Despensa`. Muéstralas juntas (una vista con las tres) y por separado (una por lista).

---

## PARTE E · Acceso por enlace abierto + alta automática (RF-18)

1. **Manage → Users → Require sign-in = ON**; proveedores **Google y Microsoft**.
2. **Are users allowed = "anyone who can access the app link"** (enlace abierto).
3. **Automation → Bot**: evento *Data change / App open* → acción **Add row a `Usuarios`** con
   `Email = USEREMAIL()` si `NOT IN(USEREMAIL(), Usuarios[Email])`. Así, quien entra por el enlace
   queda **añadido solo** a la lista de usuarios.
4. **Manage → Deploy → Move app to deployed** y comparte el **enlace**.

> Nota de coste: AppSheet desplegado con varios usuarios suele requerir plan de pago
> (por usuario activo). Revísalo antes de compartir con las 17 personas.

---

## PARTE F · Fotos de producto/plato (RF-13)

- Columna `Foto` (Image) en `Comidas` e `Ingredientes`.
- Se pueden **subir desde el móvil** o cargar el repositorio `imagenes/` (normalizado con Pillow).
- Alternativa rápida: pegar una URL pública de imagen en la celda `Foto`.

---

### Resumen operativo
1. Sube el `.xlsx` → Google Sheet (Parte A).
2. Conéctalo a SanJose2026 y añade las 11 tablas.
3. Ajusta tipos/claves (Parte B) y crea vistas (Parte C).
4. Añade las columnas virtuales (Parte D) para el cálculo y la barbacoa.
5. Configura el acceso por enlace (Parte E) y despliega.
