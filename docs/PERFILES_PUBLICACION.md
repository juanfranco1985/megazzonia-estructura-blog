# Perfiles de publicacion

Laboratorio Megazzonia se prepara con dos salidas distintas para no mezclar
conservacion local con publicacion publica.

## Paquete completo

Carpeta:

- `blog-portafolio-export/`

Objetivo:

- conservar el laboratorio navegable con demos pesadas incluidas;
- servir como backup funcional y evidencia completa;
- permitir revision local de juegos con audio, imagenes grandes y assets
  completos.

Comando:

```powershell
cmd /c npm.cmd run export:portfolio
```

## Version hosting

Carpeta:

- `blog-portafolio-hosting/`

Objetivo:

- publicar una web liviana;
- priorizar home, catalogo, fichas, capturas y demos estaticas razonables;
- evitar subir assets pesados que ralenticen el deploy o la carga publica.

Comando:

```powershell
cmd /c npm.cmd run export:hosting
```

## Que pasa con las demos pesadas

No se borran ni se modifican.

En la version hosting, algunas demos quedan como ficha/captura y se oculta el
boton de demo para no ofrecer enlaces rotos. La experiencia interactiva completa
sigue disponible en:

- la carpeta original del laboratorio;
- `blog-portafolio-export/`.

Demos tratadas como completas/locales en hosting:

- South American Runner.
- Cronicas del ultimo piloto.
- World Pong 2026.
- Real Turn Pong.
- Gato & Humano.

## Regla de comunicacion publica

Si una demo no esta copiada en el paquete hosting, el visitante debe ver una
etiqueta clara: `Demo completa local`. Esa etiqueta significa que el proyecto
existe y se preserva, pero que la publicacion publica muestra ficha/captura por
peso de assets.
