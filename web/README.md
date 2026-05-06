# 🏍️ Pegasus Mechanics — Asistente IA

Interfaz web para el taller **Pegasus Mechanics**, con un asistente de IA integrado y un panel de inventario de motos. Desarrollado con **React + Vite + TailwindCSS**.

---

##  Características

- 💬 **Chat IA** con historial de conversaciones guardadas, soporte de imágenes y reconocimiento de voz
- 🏍️ **Inventario de motos** con búsqueda en tiempo real, nombre y cilindraje
- 📱 **Diseño responsive** — adaptado para desktop y mobile
- 🎨 Paleta de colores corporativa Auteco/Pegasus (`#E10600`, `#111111`)

---

## 🛠️ Requisitos previos

Asegúrate de tener instalado:

| Herramienta | Versión mínima |
|-------------|----------------|
| [Node.js](https://nodejs.org/) | 18.x o superior |
| npm | 9.x o superior |

Verifica tu versión con:
```bash
node -v
npm -v
```

---

## 🚀 Instalación y puesta en marcha

### 1. Clona el repositorio

```bash
git clone https://github.com/pegasusAuteco/pegasusSolucionAuteco.git
cd pegasusSolucionAuteco
```
y luego `cd web`

### 3. Instala las dependencias

```bash
npm install
```

### 4. Inicia el servidor de desarrollo

```bash
npm run dev
```

Abre tu navegador en **[http://localhost:5173](http://localhost:5173)**

---

## 📁 Estructura del proyecto

```
├── public/
│   ├── logo.png                  # Logo de Pegasus Mechanics
│   └── images/motos/             # Imágenes de las motocicletas
├── src/
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── ChatContainer.jsx # Panel de chat con historial y botones de voz/imagen
│   │   │   └── ChatBubble.jsx    # Burbuja de mensaje individual
│   │   ├── Inventory/
│   │   │   ├── MotorcycleList.jsx# Lista de motos con buscador
│   │   │   └── MotorcycleCard.jsx# Tarjeta de moto (imagen, nombre, cilindraje)
│   │   └── DashboardLayout.jsx   # Layout principal (desktop/mobile)
│   ├── App.jsx
│   ├── App.css
│   └── index.css                 # Estilos globales y tokens de diseño
├── motos/                        # Catálogos PDF de referencia técnica
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

##  Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo con hot-reload |
| `npm run build` | Genera el bundle de producción en `/dist` |
| `npm run preview` | Previsualiza el build de producción localmente |
| `npm run lint` | Ejecuta el linter ESLint |

---

## 🎙️ Nota sobre el reconocimiento de voz

El botón de voz utiliza la **Web Speech API** del navegador.

> ✅ Compatible con **Google Chrome** y **Microsoft Edge**  
> ❌ No compatible con Firefox ni Safari (limitación del navegador, no del proyecto)

---


## 📄 Licencia

Proyecto interno de **Pegasus Mechanics / Auteco**. Uso restringido.
