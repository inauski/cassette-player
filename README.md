# Tape deck

[Castellano](#castellano) | [English](#english)

---

## Castellano

Reproductor de música web con forma de pletina de casete. Al pulsar play, el casete entra en la pletina, la tapa se cierra y los carretes empiezan a girar.

**Pruébalo online:** https://inauski.github.io/cassette-player/

### Qué hace

- Reproduce archivos de audio de tu ordenador (MP3, WAV, OGG, M4A, FLAC…). Puedes elegirlos con el botón o arrastrarlos a la página.
- Al empezar una canción, el casete entra en la pletina. Al cambiar de canción, sale y vuelve a entrar con la etiqueta nueva.
- La cinta pasa poco a poco del carrete izquierdo al derecho según avanza la canción.
- Mantén pulsado avance rápido o rebobinar para mover la canción. Los carretes giran más rápido mientras tanto.
- Tiene una pantalla con el estado, la pista y el tiempo, y un vúmetro estéreo que se mueve con la música.
- La lista de canciones aparece como la carátula de papel de la cinta, escrita a mano.
- La interfaz está en castellano e inglés. Elige el idioma con el botón de arriba a la derecha y se recordará la próxima vez.

Las canciones no se suben a ningún sitio: se reproducen solo en tu navegador y se pierden al recargar la página.

### Atajos de teclado

| Tecla | Acción |
| --- | --- |
| `Espacio` | Reproducir o pausar |
| `←` `→` | Retroceder o avanzar 5 s |
| `N` / `P` | Siguiente o anterior |
| `E` | Expulsar o meter la cinta |

También funcionan las teclas multimedia del teclado.

### Usarlo en local

No necesita instalación ni dependencias. Descarga o clona el repositorio y abre `cassette-player/index.html` en el navegador:

```bash
git clone https://github.com/inauski/cassette-player.git
```

### Estructura

- `cassette-player/index.html`: la pletina, el casete (SVG), los controles y la lista.
- `cassette-player/styles.css`: el diseño y todas las animaciones.
- `cassette-player/app.js`: la reproducción, la cola de animaciones, el vúmetro (Web Audio API) y el cambio de idioma.
- `cassette-player/i18n.js`: los textos de la interfaz en castellano e inglés.
- `index.html`: redirige la raíz de GitHub Pages al reproductor.

Está hecho con HTML, CSS y JavaScript, sin frameworks.

---

## English

A web music player shaped like a cassette deck. When you press play, the tape slides into the deck, the door closes and the reels start spinning.

**Try it online:** https://inauski.github.io/cassette-player/

### What it does

- Plays audio files from your computer (MP3, WAV, OGG, M4A, FLAC…). Pick them with the button or drag them onto the page.
- When a song starts, the tape goes into the deck. When you change songs, it ejects and goes back in with the new label.
- The tape moves gradually from the left reel to the right one as the song plays.
- Hold fast-forward or rewind to move through the song. The reels spin faster while you do.
- A display shows the status, track and time, and a stereo VU meter moves with the music.
- The playlist looks like the tape's handwritten paper insert.
- The interface is available in Spanish and English. Pick the language with the button at the top right; your choice is remembered.

Songs aren't uploaded anywhere: they play only in your browser and are gone when you reload the page.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play or pause |
| `←` `→` | Back or forward 5 s |
| `N` / `P` | Next or previous |
| `E` | Eject or insert the tape |

Your keyboard's media keys work too.

### Run it locally

Nothing to install. Download or clone the repository and open `cassette-player/index.html` in your browser:

```bash
git clone https://github.com/inauski/cassette-player.git
```

### Structure

- `cassette-player/index.html`: the deck, the cassette (SVG), the controls and the playlist.
- `cassette-player/styles.css`: the design and all the animations.
- `cassette-player/app.js`: playback, the animation queue, the VU meter (Web Audio API) and language switching.
- `cassette-player/i18n.js`: the interface text in Spanish and English.
- `index.html`: redirects the GitHub Pages root to the player.

Built with plain HTML, CSS and JavaScript, no frameworks.
