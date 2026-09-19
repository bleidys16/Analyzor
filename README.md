# Analyzor

Analyzor permite explorar un CSV con lenguaje natural. Sube el archivo, haz preguntas como si hablaras con un analista y obtén respuestas con tablas, gráficos y un reporte PDF.

![React](https://img.shields.io/badge/React-19-61DAFB.svg)
![DuckDB](https://img.shields.io/badge/DuckDB--WASM-1.33-FFF000.svg)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages%20%2B%20Workers-F38020.svg)
![Groq](https://img.shields.io/badge/Groq-gpt--oss-1A1A2E.svg)

## Cómo funciona

Los datos **nunca salen de tu navegador**. El análisis corre localmente con DuckDB compilado a WebAssembly; solo la traducción "pregunta → SQL" usa una IA externa, y a ella se le envía únicamente el **esquema de columnas y hasta 5 filas de muestra**.

```
Navegador (React)                                     Cloudflare Worker          Groq
 ├─ DuckDB-WASM: perfilado estadístico y SQL      ┐
 ├─ IndexedDB: datasets y historial del chat      ├─ POST /api/sql, /api/answer ─▶ gpt-oss
 ├─ PDF generado en el cliente (jsPDF)            │   (la API key vive solo aquí)
 └─ Motor de reglas (si la IA no está disponible) ┘
```

- **Chat con IA + respaldo local**: la IA genera el SQL; si falla o no hay conexión, un motor de reglas resuelve las preguntas comunes (promedio, suma, máximo, conteos, agrupaciones…).
- **Perfilado automático**: media, mediana, desviación, cuartiles, correlaciones, calidad de datos y anomalías.
- **Seguridad**: el SQL se valida (una sola consulta `SELECT`, sin funciones de lectura de archivos) y corre en el sandbox del navegador.
- **Sin servidor de datos**: no hay base de datos, ni disco, ni arranque en frío. Cuesta $0 en los planes gratuitos.

## Estructura

```
frontend/            React + Vite
  src/engine/        Motor local: DuckDB, perfilado, chat, PDF, IndexedDB
  src/api/           Adaptadores que exponen el motor con la forma de API que usa la UI
  src/pages, components/
worker/              Cloudflare Worker: proxy de IA (oculta la API key de Groq)
```

## Desarrollo local

Requisitos: Node 20+.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas del motor
```

Sin más configuración la app funciona con el motor de reglas. Para activar la IA en local:

```bash
cd worker
npm install
npx wrangler dev --var GROQ_API_KEY:<tu-clave>     # http://localhost:8787
# en otra terminal, en frontend/.env.local:
#   VITE_LLM_URL=http://localhost:8787
```

> No pegues la clave en el código ni en el repo (`.env.local` está ignorado por git).

## Despliegue (planes gratuitos)

**1. Worker de IA**

```bash
cd worker
npx wrangler login
npx wrangler secret put GROQ_API_KEY        # tu clave de https://console.groq.com
# edita ALLOWED_ORIGINS en wrangler.toml con el dominio de tu Pages
npx wrangler deploy                         # imprime la URL, p. ej. https://analyzor-llm.<usuario>.workers.dev
```

**2. Frontend en Cloudflare Pages**

- Conecta el repositorio en Cloudflare Pages.
- Directorio raíz: `frontend` · Comando de build: `npm run build` · Directorio de salida: `dist`
- Variable de entorno: `VITE_LLM_URL` = la URL del Worker.

Los binarios de DuckDB-WASM (~35 MB) se descargan del CDN de jsDelivr en la primera visita y quedan en caché; no se suben a Pages (que limita cada archivo a 25 MiB).

## Límites conocidos

- Los datasets viven en el navegador (IndexedDB): borrar los datos del sitio los elimina. Tamaño máximo: 200 MB por CSV.
- Los límites y modelos de los planes gratuitos (Groq, Cloudflare) cambian con el tiempo; el modelo se configura con la variable `GROQ_MODEL` (por defecto `openai/gpt-oss-120b`; Groq retiró `llama-3.3-70b-versatile` el 16/08/2026, consulta [la lista de deprecaciones](https://console.groq.com/docs/deprecations)).
- La versión anterior (Django + PostgreSQL en Render) está disponible en el tag `legacy-django`.

## Camino a producto

La persistencia pasa por `frontend/src/engine/store.js`. Para cuentas de usuario y sincronización entre dispositivos basta con implementar la misma interfaz sobre un servicio como Supabase (Auth + Storage) y aplicar cuotas por usuario en el Worker.
