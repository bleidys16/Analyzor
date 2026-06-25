# Analyzor

Plataforma de análisis de datos con IA. Sube archivos CSV, haz consultas en lenguaje natural y obtén visualizaciones automáticas.

![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)
![Django](https://img.shields.io/badge/Django-4.2%2B-darkgreen.svg)
![React](https://img.shields.io/badge/React-19%2B-61DAFB.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-316192.svg)
![DuckDB](https://img.shields.io/badge/DuckDB-1.5%2B-FFF000.svg)
![Groq](https://img.shields.io/badge/Groq-Llama%203-1A1A2E.svg)

## Funcionalidades

- **Chat con IA** — Haz preguntas en lenguaje natural sobre tus datos. La IA genera SQL, lo ejecuta y responde con texto + gráficas.
- **Chat híbrido** — Cuando la IA no genera SQL válido, un motor local DuckDB con reglas predefinidas toma el control.
- **Perfilado automático** — Estadísticas descriptivas (media, mediana, desviación, percentiles), histogramas y gráficos de dona.
- **Gestión de datasets** — Subida, vista previa (tabla interactiva), eliminación, historial por sesión.
- **Tema oscuro/claro** — Con persistencia en localStorage.
- **Landing page** — Hero responsivo con glow animado, carrusel de tecnologías y sección de funcionalidades.

## Estructura

```
analyzor/
├── backend/
│   ├── analyzor/          # Configuración Django
│   ├── chat/              # Lógica de chat, SQL, IA
│   ├── datasets/          # API de datasets (CRUD)
│   ├── analysis/          # Perfilado estadístico
│   ├── api/               # Endpoints REST
│   ├── users/             # Autenticación
│   └── export/            # Exportación (PDF)
├── frontend/
│   ├── src/
│   │   ├── pages/         # Landing, Dashboard
│   │   ├── components/    # Chat, gráficas, UI
│   │   ├── api/           # Cliente Axios
│   │   └── store/         # Estado global (Zustand)
│   └── public/            # Logo, favicon
└── README.md
```

## Desarrollo local

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Variables de entorno

`backend/.env`:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL (producción) o SQLite (local) |
| `GROQ_API_KEY` | API key de Groq |
| `OLLAMA_URL` | URL de Ollama local (ej. `http://localhost:11434`) |
| `ENV` | `production` o `development` |

## Despliegue

Ambos servicios se despliegan automáticamente desde GitHub vía Render Blueprint (`render.yaml`).
