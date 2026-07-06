import os
from groq import Groq
import requests

OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free"


class AIProvider:
    """Proveedor de IA - Groq, OpenRouter u Ollama"""

    def __init__(self):
        self.env = os.getenv('ENV', 'dev')
        self.openrouter_key = os.getenv('OPENROUTER_API_KEY')
        # Groq solo si hay API key
        groq_key = os.getenv('GROQ_API_KEY')
        self.groq_client = Groq(api_key=groq_key) if groq_key and self.env == 'production' else None
        self.ollama_url = os.getenv('OLLAMA_URL') or 'http://localhost:11434'

    def _system_prompt(self):
        return """Eres Analyzor, un asistente de análisis de datos con personalidad amable y profesional.

REGLAS ESTRICTAS:
1. NUNCA expliques cómo se calcula algo (fórmulas, sumas, divisiones).
2. NUNCA digas "no tengo acceso a los datos" o "necesito los datos específicos".
3. NUNCA des respuestas teóricas sobre cómo se haría algo.
4. Siempre responde con el número real del resultado disponible en el contexto.
5. Si no tienes un número concreto, usa la información del dataset disponible.
6. Tus respuestas deben ser cortas y directas con los datos reales."""

    def _openrouter_chat(self, messages: list, max_tokens: int = 1000) -> str:
        if not self.openrouter_key:
            return None
        try:
            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openrouter_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://analyzor.app",
                },
                json={
                    "model": OPENROUTER_MODEL,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": 0.5,
                },
                timeout=30,
            )
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"].strip()
            return None
        except Exception:
            return None

    def chat(self, message: str, context: str = "") -> str:
        """Conversación general con personalidad Analizor"""
        system = self._system_prompt()

        if context:
            system += f"\n\nDatos disponibles:\n{context}"

        msgs = [
            {"role": "system", "content": system},
            {"role": "user", "content": message},
        ]

        # Intentar OpenRouter primero
        if self.openrouter_key:
            result = self._openrouter_chat(msgs)
            if result:
                return result

        # Fallback a Groq
        if self.groq_client:
            try:
                completion = self.groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=msgs,
                    max_tokens=1000,
                    temperature=0.5,
                )
                return completion.choices[0].message.content.strip()
            except Exception:
                pass

        # Último recurso: Ollama
        result = self._generate_with_ollama(f"{system}\n\n{message}")
        if result:
            return result
        return "¡Hola! Soy Analyzor. No tengo un modelo de IA configurado para responder. Configura una API key de OpenRouter o Groq, o inicia Ollama localmente para usar el chat."

    def generate_sql(self, question: str, schema: str) -> str:
        """Convierte pregunta en lenguaje natural a SQL"""
        system = """You are a SQL expert. Your ONLY task is to convert natural language questions into valid SQL queries.

RULES (strict):
- Return ONLY the raw SQL query — no markdown, no backticks, no code fences, no explanations
- The table name is always: data
- Only generate SELECT queries
- If you cannot generate SQL, return exactly: Error: cannot generate SQL
- Never return text like "The average is calculated by..."

EXAMPLES:
Question: "¿Cuál es la categoría más vendida?"
SQL: SELECT product_category, SUM(quantity) as total FROM data GROUP BY product_category ORDER BY total DESC LIMIT 1

Question: "¿Cuál es el valor medio de venta?"
SQL: SELECT AVG(total_sale) FROM data

Question: "¿Cuántas órdenes hay?"
SQL: SELECT COUNT(*) FROM data

Question: "muestra los primeros 10 registros"
SQL: SELECT * FROM data LIMIT 10"""

        user_msg = f"""Schema:
{schema}

Question: {question}

SQL:"""

        msgs = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ]

        # OpenRouter
        if self.openrouter_key:
            result = self._openrouter_chat(msgs)
            if result:
                return result

        # Groq
        if self.groq_client:
            try:
                completion = self.groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=msgs,
                    max_tokens=500,
                    temperature=0.1,
                )
                return completion.choices[0].message.content.strip()
            except Exception:
                pass

        result = self._generate_with_ollama(f"{system}\n\n{user_msg}")
        return result

    def answer_question(self, question: str, context: str) -> str:
        """Responde una pregunta con contexto de datos (números reales)"""
        system = self._system_prompt()
        system += f"""

Contexto actual del dataset:
{context}

IMPORTANTE: Debes responder SOLO con los números reales del contexto de arriba.
No expliques cómo se calculan, no digas que necesitas más datos, no des teoría.
Si el contexto tiene números, úsalos. Si no los tiene, di que no hay datos disponibles."""

        msgs = [
            {"role": "system", "content": system},
            {"role": "user", "content": question},
        ]

        # OpenRouter
        if self.openrouter_key:
            result = self._openrouter_chat(msgs)
            if result and not self._is_theory_response(result):
                return result

        # Groq
        if self.groq_client:
            try:
                completion = self.groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=msgs,
                    max_tokens=1000,
                    temperature=0.5,
                )
                answer = completion.choices[0].message.content.strip()
                if not self._is_theory_response(answer):
                    return answer
            except Exception:
                pass

        return self._extract_numbers_from_context(question, context)

    def _extract_numbers_from_context(self, question: str, context: str) -> str:
        import re as _re
        question_lower = question.lower()
        if any(w in question_lower for w in ['promedio', 'media', 'average', 'avg', 'mean']):
            lines = [l.strip() for l in context.split('\n') if l.strip()]
            avg_lines = [l for l in lines if any(w in l.lower() for w in ['avg', 'promedio', 'average', 'mean'])]
            if avg_lines:
                return '\n'.join(avg_lines[:3])
            return f"Los datos están disponibles. Columnas: {lines[0] if lines else 'ver dataset'}."
        return "Revisa los datos disponibles en la tabla para obtener resultados específicos."

    def _is_theory_response(self, text: str) -> bool:
        theory_patterns = [
            'no puedo calcular', 'necesitaría', 'necesito los datos',
            'sin datos específicos', 'sin acceso', 'se puede hacer con la fórmula',
            'se calcula con', 'la fórmula', 'suponiendo que',
            'the average is calculated', 'i need more details',
            'i don\'t have access', 'assuming you mean',
            'you can calculate it by', 'to calculate',
        ]
        return any(p in text.lower() for p in theory_patterns)

    def _generate_with_groq(self, system: str, user: str) -> str:
        try:
            if not self.groq_client:
                return "Error: Groq no inicializado"
            completion = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                max_tokens=1000,
                temperature=0.3,
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            return f"Error con Groq: {str(e)}"

    def _generate_with_ollama(self, prompt: str) -> str:
        try:
            response = requests.post(
                f'{self.ollama_url}/api/generate',
                json={
                    'model': 'mistral',
                    'prompt': prompt,
                    'stream': False,
                    'temperature': 0.3,
                },
                timeout=30,
            )
            if response.status_code == 200:
                return response.json()['response'].strip()
        except Exception:
            pass
        return None