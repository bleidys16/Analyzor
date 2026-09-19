// Genera las capturas del README en docs/screenshots/ usando un Chrome o Edge ya instalado.
//   1. npm run dev   (con VITE_LLM_URL apuntando al Worker si quieres respuestas de IA reales)
//   2. npm run screenshots
// Variables opcionales: APP_URL (por defecto http://localhost:5173) y BROWSER_PATH.
import puppeteer from 'puppeteer-core'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const APP_URL = process.env.APP_URL || 'http://localhost:5173'
const OUT_DIR = fileURLToPath(new URL('../../docs/screenshots/', import.meta.url))
const BROWSER = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((path) => path && existsSync(path))

if (!BROWSER) {
  console.error('No encontré Chrome ni Edge. Indica la ruta con BROWSER_PATH.')
  process.exit(1)
}
mkdirSync(OUT_DIR, { recursive: true })

const QUESTIONS = [
  '¿Qué categoría genera más ingresos y cuánto?',
  'Promedio de cantidad por ciudad',
]

const browser = await puppeteer.launch({
  executablePath: BROWSER,
  headless: true,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
})

try {
  const page = await browser.newPage()
  page.on('pageerror', (err) => console.error('Error en la página:', err.message))

  const shot = async (name, options = {}) => {
    await page.screenshot({ path: `${OUT_DIR}${name}.png`, ...options })
    console.log(`  ✔ ${name}.png`)
  }
  const clickButton = (text) =>
    page.evaluate((label) => {
      const button = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label)
      if (!button) throw new Error(`No hay un botón "${label}"`)
      button.click()
    }, text)
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  // 1. Portada
  await page.goto(APP_URL, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  await pause(800)
  await shot('01-portada')

  // 2. Dashboard con el dataset de ejemplo (un clic desde la portada)
  await clickButton('Probar con datos de ejemplo')
  await page.waitForFunction(() => location.pathname.startsWith('/dashboard/'), { timeout: 60000 })
  await page.waitForFunction(() => document.body.innerText.includes('Resumen de Columnas'), { timeout: 60000 })
  await pause(1200)
  await shot('02-analisis')

  // 3. Chat: preguntas con gráficos y respuestas
  await clickButton('Asistente IA')
  await pause(600)
  for (const question of QUESTIONS) {
    await page.type('input[placeholder="Escribe tu pregunta..."], textarea[placeholder="Escribe tu pregunta..."]', question)
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Escribe tu pregunta..."], textarea[placeholder="Escribe tu pregunta..."]')
      ;(input.parentElement.querySelector('button') || input.closest('div').querySelector('button')).click()
    })
    await page.waitForFunction(
      (q) => {
        const text = document.body.innerText
        const at = text.lastIndexOf(q)
        return at >= 0 && text.slice(at + q.length).trim().length > 20
      },
      { timeout: 45000 },
      question
    )
    await pause(900)
  }
  await pause(2200) // deja que termine la animación del gráfico
  await shot('03-chat')

  // 4. Vista previa de datos
  await clickButton('Vista Previa')
  await pause(700)
  await shot('04-vista-previa')
} finally {
  await browser.close()
}
console.log(`Capturas guardadas en ${OUT_DIR}`)
