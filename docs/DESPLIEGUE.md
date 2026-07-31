# Puesta en marcha (setup único, ~10 min)

La app web ya está publicada en **GitHub Pages**:
**https://casaeficiente.github.io/CompraSanJose/**

Para activarla (login Google + datos de tu Sheet) hay que hacer **dos altas gratuitas una
sola vez**. Te doy los pasos; al final me pasas **dos claves** y yo la enciendo.

---

## Parte 1 · ID de acceso de Google (OAuth Client ID)
Permite el botón "Entrar con Google".

1. Entra en **https://console.cloud.google.com/** con tu Gmail.
2. Arriba, crea/elige un **proyecto** (p. ej. "CompraSanJose").
3. Menú ☰ → **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: **Externo** → Crear.
   - Nombre de la app: `CompraSanJose` · Correo de asistencia: tu Gmail · Correo del
     desarrollador: tu Gmail → Guardar y continuar (los pasos de Ámbitos y Resumen, deja por
     defecto y guarda). No hacen falta permisos especiales (solo email/perfil).
4. Menú → **APIs y servicios → Credenciales → + Crear credenciales → ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - **Orígenes autorizados de JavaScript** → Añadir URI: `https://casaeficiente.github.io`
   - Crear. Copia el **ID de cliente** (`...apps.googleusercontent.com`). **→ me lo pasas.**

> Autorización de quién entra: NO se controla aquí. Cualquiera puede pulsar "Entrar", pero
> solo funcionan los correos de la hoja **Usuarios** (paso final). Es la lista blanca.

---

## Parte 2 · Backend (Apps Script sobre tu Sheet)

1. Abre el Google Sheet **CompraSanJose** → **Extensiones → Apps Script**.
2. Borra lo que haya y **pega el contenido de `apps-script/Code.gs`** (de este repo).
3. Arriba, **Implementar → Nueva implementación**.
   - Tipo (rueda ⚙️): **Aplicación web**.
   - **Ejecutar como: Yo**.
   - **Quién tiene acceso: Cualquier usuario** (o "…incluso anónimos").
   - **Implementar** → autoriza (te pedirá permisos de tu cuenta; acéptalos).
4. Copia la **URL de la aplicación web** (termina en **`/exec`**). **→ me la pasas.**

---

## Parte 3 · Autorizar a tu grupo
En el Sheet, pestaña **Usuarios**, añade una fila por persona con su **Email** (columna
Email). Solo esos correos podrán entrar. (Tu correo ya está.)

---

## Y ya
Pásame **(1) el ID de cliente** y **(2) la URL `/exec`**. Yo las inserto en la app, hago push,
y en 1 minuto está **funcionando y compartida**. Cada uno abre
`https://casaeficiente.github.io/CompraSanJose/` en el móvil, entra con Google, y la instala
(Android: "Añadir a pantalla de inicio"; iPhone: Safari → Compartir → "Añadir a pantalla de inicio").
