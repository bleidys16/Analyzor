# Analyzor

Analyzor es una plataforma que combina inteligencia artificial con análisis de datos tradicional para que cualquier persona pueda explorar sus datasets usando lenguaje natural. Sube un CSV, haz preguntas como si hablaras con un analista, y obtén respuestas con gráficos, tablas y reportes PDF al instante.

![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)
![Django](https://img.shields.io/badge/Django-4.2%2B-darkgreen.svg)
![React](https://img.shields.io/badge/React-19%2B-61DAFB.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-316192.svg)
![DuckDB](https://img.shields.io/badge/DuckDB-1.5%2B-FFF000.svg)
![Groq](https://img.shields.io/badge/Groq-Llama%203-1A1A2E.svg)

## Funcionalidades

- **Chat con IA** — Haz preguntas en lenguaje natural sobre tus datos. La IA genera SQL, lo ejecuta y responde con texto + gráficos.
- **Chat híbrido** — Cuando la IA falla, un motor DuckDB con reglas predefinidas toma el control automáticamente.
- **Perfilado automático** — Estadísticas descriptivas (media, mediana, desviación, percentiles), histogramas y gráficos de dona.
- **Gestión de datasets** — Subida, vista previa interactiva, eliminación e historial por sesión.
- **Exportación a PDF** — Genera reportes con tablas y gráficos listos para compartir.
- **Tema oscuro/claro** — Con persistencia en localStorage.

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

## Requisitos del sistema

- **Python** 3.11+
- **Node.js** 18+
- **PostgreSQL** 16+ (opcional, usa SQLite por defecto en local)

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
