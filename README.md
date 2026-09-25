# Abril y Johann · 22 de octubre de 2026

Invitación de boda estática. Sin framework, sin build, sin dependencias: son
archivos HTML, CSS y JavaScript que GitHub Pages sirve tal cual.

La confirmación de asistencia se guarda en un Google Sheet a través de un
Google Apps Script vinculado a ese Sheet.

```
index.html                  la invitación
assets/css/styles.css       estilos
assets/js/config.js         <- lo único que tenés que editar
assets/js/app.js            el link del mapa y la cuenta regresiva
assets/js/rsvp.js           tarjeta de confirmación
assets/img/og.png           la imagen que se ve al compartir el link
assets/img/sello.svg        el emblema de San Ignacio, también favicon
data/invitados.js           los grupos y sus links (lo regenera el Sheet)
gas/Code.gs                 el backend, va dentro del Google Sheet
tools/probar-backend.js     pruebas del backend
tools/probar-cuenta.js      pruebas de la cuenta regresiva
tools/probar-estilos.js     pruebas de CSS
tools/probar-movil.js       pruebas de layout en pantallas de teléfono
tools/probar-rsvp.js        pruebas de comportamiento del formulario
tools/banco-movil.html      el banco donde se mide el móvil
tools/banco-rsvp.html       el banco donde se aprieta el formulario
tools/reparar-encoding.js   busca caracteres rotos por PowerShell
tools/generar-links.html    tabla de links y mensajes, sólo para uso local
tools/og-preview.html       plantilla de la imagen para compartir
```

---

## 1. Configurar `config.js`

Abrí `assets/js/config.js` y poné tu usuario de GitHub:

```js
usuario: 'Jyuls',                  // tu usuario de GitHub, sin https://
urlSitio: 'https://jyuls.github.io/boda/',
urlScript: '',                     // <- se llena en el paso 4
```

`usuario` es sólo el nombre de usuario, sin `https://` y sin `/boda`. El sitio
arma la dirección solo como `https://TU_USUARIO.github.io/boda/`.

Si tu repositorio se llama distinto de `boda`, poné la dirección completa en
`urlSitio` (con `/` al final). Esa es la que usan los links de invitación y la
tabla de `generar-links.html`.

**Qué pasa si dejás algo sin configurar.** La invitación se ve y funciona
igual: no se rompe nada. `urlScript` vacío hace que, al confirmar, el sitio lo
diga explícitamente y te muestre el texto para mandarlo por WhatsApp, en vez de
perder la respuesta en silencio. Y `tools/generar-links.html` avisa arriba que
los links no sirven todavía.

---

## 1b. Lo que se decidió quitar de la página

Estas cosas ya no están en la invitación, pero conviene saber qué quedó atrás
para que nadie las busque y no las encuentre:

- **El campo de acompañantes.** El backend y la columna del Sheet siguen ahí, y
  `gas/Code.gs` los sigue leyendo y sumando en el resumen: lo que se quitó fue
  el formulario. El sitio manda la lista siempre vacía. Si algún día vuelve a
  hacer falta, hay que rearmar el `input` en `rsvp.js`.
- **El botón de agregar al calendario** y con él todo el código que armaba el
  archivo `.ics` en `app.js`. Quedó solamente el link de Google Maps.
- **El aviso de recepción** y los textos de "escríbenos y lo arreglamos". El
  `<p class="ayuda">` sigue existiendo porque es donde aparece el error real
  ("falta decidir por..."), pero nace vacío y el CSS lo oculta con
  `.ayuda:empty`.

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
git commit -m "Invitación Abril y Johann"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

Después, en el repo: **Settings → Pages → Source: main / (root) → Save**.

Tu invitación queda en `https://TU_USUARIO.github.io/TU_REPO/`. Si el repo se
llama `boda` y es tuyo, queda en `https://TU_USUARIO.github.io/boda/`, que es
lo que da por hecho el sitio. Si el repo se llama otra cosa, poné la dirección
completa en `urlSitio` de `config.js`.

Trabajando localmente sobre esa URL, actualizá `usuario` en `config.js` y
después la columna `url_base` de la pestaña `Config` del Sheet, y volvé a
correr **Boda → Generar lista para la web** para que los links coincidan.

### Una vez publicado, dos ajustes

**La imagen de WhatsApp.** El link trae una imagen (`assets/img/og.png`, de
1200x630) para que se vea bonita en el chat. En `index.html` va con la
dirección completa, porque la mayoría de los lectores de WhatsApp y Facebook no
resuelven rutas relativas:

```html
<meta property="og:image" content="https://jyuls.github.io/boda/assets/img/og.png">
```

Si algún día querés cambiar el diseño, editá `tools/og-preview.html`, abrilo en
el navegador con la ventana en 1200x630 y volvé a capturar como `og.png`. El
nombre del archivo importa: la imagen tiene los nombres de los novios
escritos, así que también hay que regenerarla si cambian.

---

## 7. Ver quién confirmó

**Boda → Ver resumen**, o mirá la pestaña `Resumen` del Sheet: cuántas
invitaciones se mandaron, cuántas confirmaron, cuántas personas asistirán,
cuántos acompañantes se suman, y el detalle de quién falta por responder.

Las respuestas crudas, una por línea, están en `Respuestas`. Si alguien
confirma otra vez, se actualiza su fila en lugar de duplicarse.

---

## Pruebas

Con el servidor local levantado (paso 2), corré:

```
node tools/reparar-encoding.js    que nadie haya roto la codificación
node tools/probar-backend.js      59 pruebas del backend, sin Google
node tools/probar-cuenta.js       13 pruebas de la cuenta regresiva
node tools/probar-estilos.js      CSS: clases, variables, pesos de fuente
node tools/probar-movil.js        15 pantallas de teléfono, sin scroll ni overflow
node tools/probar-rsvp.js         17 pruebas de comportamiento del formulario
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
estilo, que no queden reglas huérfanas, que toda `var(--x)` tenga su
declaración y que las fuentes que pide el HTML sean las que el CSS usa. Cubre un
tipo de error que el navegador no avisa: si una variable de color no existe, la
aplica como si nada y el elemento se queda sin pintar.

`probar-movil.js` y `probar-rsvp.js` abren un navegador de verdad. El primero
mide la invitación en cinco anchos (320 a 600 px) en sus tres estados —la
tarjeta de Sí/No, el buscador y la confirmación— y avisa si algo se sale de la
pantalla, si aparece scroll horizontal, si el texto queda chico o si un botón es
más chico que 44 px. El segundo aprieta el formulario como lo haría una persona
y comprueba que marcar, desmarcar, avisar que falta alguien y llegar a la
confirmación funcionan.

Los dos verifican también que estén midiendo la pantalla que dicen. Sin esa
comprobación, un banco de pruebas puede pasar mientras mide otra cosa: es un
fallo que ya se dio más de una vez acá.

`reparar-encoding.js` existe porque PowerShell 5.1 rompe los acentos si se
escriben archivos con `Get-Content` + `Set-Content -Encoding UTF8`: guarda el
texto dos veces codificado (cada acento queda con un carácter raro adelante) o,
si el carácter no se puede representar en la página de códigos de la consola, lo
cambia por un signo de reemplazo que ya no se puede recuperar. Este script
deshace el primer caso y avisa del segundo. **No uses `Set-Content` en este
proyecto**: usá un editor o Node.

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
