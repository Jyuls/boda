# Johann y Abril · 22 de octubre de 2026

Invitación de boda estática. Sin framework, sin build, sin dependencias: son
archivos HTML, CSS y JavaScript que GitHub Pages sirve tal cual.

La confirmación de asistencia se guarda en un Google Sheet a través de un
Google Apps Script vinculado a ese Sheet.

```
index.html                  la invitación
assets/css/styles.css       estilos
assets/js/config.js         <- lo único que tenés que editar
assets/js/app.js            cuenta regresiva y archivo de calendario
assets/js/rsvp.js           tarjeta de confirmación
assets/img/og.png           la imagen que se ve al compartir el link
assets/img/sello.svg        el emblema de San Ignacio, también favicon
data/invitados.js           los grupos y sus links (lo regenera el Sheet)
gas/Code.gs                 el backend, va dentro del Google Sheet
tools/probar-backend.js     pruebas del backend
tools/probar-cuenta.js      pruebas de la cuenta regresiva
tools/probar-estilos.js     pruebas de CSS
tools/generar-links.html    tabla de links y mensajes, sólo para uso local
tools/og-preview.html       plantilla de la imagen para compartir
```

---

## 1. Configurar `config.js`

Abrí `assets/js/config.js` y poné tu usuario de GitHub:

```js
usuario: 'TU_USUARIO',   // <- reemplazalo
urlScript: '',           // <- se llena en el paso 4
```

`usuario` es sólo el nombre de usuario, sin `https://` y sin `/boda`. El sitio
arma los links solos como `https://TU_USUARIO.github.io/boda/#CODIGO`.

Si no lo cambias, el sitio te avisa en pantalla en vez de generar links rotos.

---

## 2. Verlo en local

Desde la carpeta del proyecto:

```
python -m http.server 8000
```

Abrí <http://localhost:8000>. Al final de la invitación, escribí el nombre de
alguien de la lista de ejemplo para probar la tarjeta de respuesta.

---

## 3. Poner el backend en el Sheet

La hoja es esta: <https://docs.google.com/spreadsheets/d/1eGdVLKygzBWYvugZ5dMqYbxJ4Q444RxkyIHOKDvxwtI/edit?usp=sharing>

1. Abrí el Sheet.
2. Menú **Extensiones → Apps Script**.
3. Borrá lo que haya en `Code.gs` y pegá el contenido de `gas/Code.gs`.
4. Guardá (Ctrl+S). Google le pone nombre solo, no hace falta cambiarlo.
5. Recargá la pestaña del Sheet. Aparece un menú nuevo llamado **Boda**.
6. Elegí **Boda → Instalar invitaciones**.

Eso crea cinco pestañas: `Invitados`, `Respuestas`, `Resumen`, `Config`,
`Generado`, y llena `Invitados` con 30 invitaciones de ejemplo.

**Sacá el ejemplo.** En `Invitados` borrá las filas de muestra y escribí las
tuyas. Por cada grupo que invitás:

| columna | qué va |
|---|---|
| `grupo` | el nombre del grupo, ej. `Familia Carrillo` |
| `miembros` | los nombres separados por coma, **sin** comas dentro de cada nombre |
| `max_acompanantes` | cuántas personas de fuera puede llevar cada quien (vacío = 2) |
| `notas` | opcional, para ti |

El código de la columna `A` se genera solo y **no cambia nunca**, aunque
vuelvas a correr el instalador. Los links que ya mandaste siguen sirviendo.

---

## 4. Publicar el Apps Script

En el editor de Apps Script: **Implementar → Nueva implementación → Aplicación
web**.

- *Ejecutar como*: tú mismo
- *Quién puede acceder*: **Cualquier persona**

Esto último no es un descuido: la página se abre desde el navegador de cada
invitado, y sin esa opción el servidor rechaza la respuesta. El backend
ignora cualquier código que no exista en la hoja, así que no se pueden meter
respuestas falsas.

Copiá la **URL de la aplicación web** (termina en `/exec`) y ponela en
`assets/js/config.js`:

```js
urlScript: 'https://script.google.com/macros/s/AKfy.../exec',
```

> Guardá esa URL en un lugar seguro. Después de la boda podés borrar la
> implementación y apagar el sitio sin romper nada.

---

## 5. Mandar las invitaciones

En la pestaña `Invitados` ya tenés la columna `link` y la columna `mensaje`
con el texto listo.

Para verlas todas en una tabla con botones de copiar, abrí en local
`http://localhost:8000/tools/generar-links.html`.

Alternativa: el Sheet también tiene la pestaña `Generado`, que ya viene con
código para pegar en `data/invitados.js`. Úsala si querés que el sitio muestre
las invitaciones por nombre en vez de pedir el código.

---

## 6. Publicar en GitHub Pages

El sitio es estático, así que cualquier hosting sirve. Con GitHub Pages:

```
git init
git add .
git commit -m "Invitación Johann y Abril"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

Después, en el repo: **Settings → Pages → Source: main / (root) → Save**.

Tu invitación queda en `https://TU_USUARIO.github.io/TU_REPO/`. Si el repo se
llama `boda` y es tuyo, queda en `https://TU_USUARIO.github.io/boda/`, que es
lo que da por hecho el sitio.

Trabajando localmente sobre esa URL, actualizá `usuario` en `config.js` y
después la columna `url_base` de la pestaña `Config` del Sheet, y volvé a
correr **Boda → Generar lista para la web** para que los links coincidan.

### Una vez publicado, dos ajustes

**La imagen de WhatsApp.** El link trae una imagen (`assets/img/og.png`, de
1200x630) para que se vea bonita en el chat. Está puesta con ruta relativa,
pero la mayoría de los lectores de WhatsApp esperan la dirección completa. En
`index.html` cambiá:

```html
<meta property="og:image" content="assets/img/og.png">
```

por la versión con el dominio, ej.
`https://TU_USUARIO.github.io/boda/assets/img/og.png`.

Si algún día querés cambiar el diseño, editá `tools/og-preview.html`, abrilo en
el navegador con la ventana en 1200x630 y volvé a capturar como `og.png`.

---

## 7. Ver quién confirmó

**Boda → Ver resumen**, o mirá la pestaña `Resumen` del Sheet: cuántas
invitaciones se mandaron, cuántas confirmaron, cuántas personas asistirán,
cuántos acompañantes se suman, y el detalle de quién falta por responder.

Las respuestas crudas, una por línea, están en `Respuestas`. Si alguien
confirma otra vez, se actualiza su fila en lugar de duplicarse.

---

## Pruebas

El backend se puede probar sin Google, simulando el Sheet:

```
node tools/probar-backend.js
node tools/probar-cuenta.js
node tools/probar-estilos.js
```

`probar-backend.js` son 59 pruebas que cubren la instalación, la generación de
links y códigos, el `data/invitados.js` que produce, el envío de respuestas, el
filtrado de nombres ajenos, el límite de acompañantes, la corrección de
respuestas y el resumen.

`probar-cuenta.js` corre la cuenta regresiva con el reloj simulado en los cinco
momentos que importan: la boda dentro de semanas, el día previo, el mismo día a
la mañana, el mismo día cuando la hora ya pasó, y una fecha mal escrita. Esta
prueba existe porque la comparación que decidía si la boda era "hoy" estaba
invertida, y el sitio anunciaba "Hoy es el día" un mes antes de la fecha.

`probar-estilos.js` revisa que ninguna clase del HTML o del JS se quede sin
estilo, que no queden reglas huérfanas y que toda `var(--x)` tenga su
declaración. Cubre un tipo de error que el navegador no avisa: si una variable
de color no existe, la aplica como si nada y el elemento se queda sin pintar.

Para revisar que nada del frontend esté roto:

```
node --check assets/js/config.js
node --check assets/js/app.js
node --check assets/js/rsvp.js
node --check data/invitados.js
```

---

## Detalles técnicos

**Por qué un Apps Script y no la API de Sheets.** Una página estática no puede
escribir en un Sheet con la API de Sheets: Google exige pasar por OAuth, y no
hay forma de meter ese flujo en un HTML suelto. El Apps Script va detrás de un
`fetch` en modo `no-cors`.

**Qué significa eso.** Con `no-cors` el navegador no puede leer la respuesta,
así que la página no puede confirmar si la fila se escribió: asume que sí y
guarda una copia en `localStorage` por si acaso. Si algo falla, te muestra el
mensaje para que lo mandes por WhatsApp en lugar de perderlo en silencio.

**La lista de invitados es pública.** `data/invitados.js` queda publicado en
el repo, así que los nombres y los links son legibles por cualquiera que
conozca la dirección. Si preferís que no, dejá el sitio sin esa lista y que
los invitados entren por su link personal.

**Los enlaces del mapa.** El botón abre Google Maps en el teléfono. Si abrís la
invitación en la computadora, podés cambiar la pestaña a **Ordenador** para
sacarle la ruta paso a paso.
