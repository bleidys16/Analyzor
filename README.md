# ANALYZOR

<p align="center">
  <img src="frontend/public/faviconA.png" alt="Analyzor" height="80"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white" alt="Django"/>
  <img src="https://img.shields.io/badge/Groq-1A1A2E?style=for-the-badge&logo=groq&logoColor=00E7A0" alt="Groq"/>
  <br/>
  <img src="https://img.shields.io/badge/DuckDB-FFF000?style=for-the-badge&logo=duckdb&logoColor=black" alt="DuckDB"/>
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Recharts-22B5BF?style=for-the-badge&logo=recharts&logoColor=white" alt="Recharts"/>
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel"/>
</p>

Plataforma de análisis de datos con IA. Sube archivos CSV, haz consultas en lenguaje natural y obtén visualizaciones automáticas.

## Stack

| Frontend | Backend | IA | Base de datos |
|----------|---------|----|---------------|
| React 19 + Vite 8 | Django 4.2 + DRF | Groq (Llama 3 70B) | DuckDB (análisis) |
| Recharts | DuckDB | Ollama (local) | PostgreSQL (app) |
| React Router 7 | Gunicorn | SQL generativo | Neon / Supabase |

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

- **Frontend**: Vercel (build: `npm run build`, output: `dist/`)
- **Backend**: Render / Railway (start: `gunicorn analyzor.wsgi`)
- **Base de datos**: Neon (PostgreSQL)
