import os
from groq import Groq
import requests

class AIProvider:
    """Proveedor de IA - puede ser Groq u Ollama"""
    
    def __init__(self):
        self.env = os.getenv('ENV', 'dev')
        if self.env == 'production':
            try:
                self.client = Groq(api_key=os.getenv('GROQ_API_KEY'))
            except Exception as e:
                print(f"Error inicializando Groq: {e}")
                self.client = None
        self.ollama_url = os.getenv('OLLAMA_URL', 'http://localhost:11434')
    
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

        if self.env == 'production' and self.client:
            return self._generate_with_groq(system, user_msg)
        else:
            return self._generate_with_ollama(f"{system}\n\n{user_msg}")
    
    def answer_question(self, question: str, context: str) -> str:
        """Responde una pregunta con contexto de datos"""
        system = """You are a data analyst assistant. Answer the user's question based ONLY on the actual data provided in the context.

RULES:
- Be concise and professional. Provide specific numbers and insights.
- If the context contains query results, use those numbers directly.
- NEVER give theoretical explanations like "the average is calculated by summing values and dividing by count".
- NEVER say "I don't have access to the values". You DO have the data context.
- If the context only lists column names (no actual row data), tell the user what columns are available and suggest specific questions they can ask."""

        user_msg = f"""Data Context:
{context}

Question: {question}

Answer:"""
        
        if self.env == 'production' and self.client:
            return self._generate_with_groq(system, user_msg)
        else:
            return self._generate_with_ollama(f"{system}\n\n{user_msg}")
    
    def _generate_with_groq(self, system: str, user: str) -> str:
        """Usa Groq API con system + user messages"""
        try:
            if not self.client:
                return "Error: Groq no inicializado"
            
            completion = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user}
                ],
                max_tokens=1000,
                temperature=0.3
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            return f"Error con Groq: {str(e)}"
    
    def _generate_with_ollama(self, prompt: str) -> str:
        """Usa Ollama local"""
        try:
            response = requests.post(
                f'{self.ollama_url}/api/generate',
                json={
                    'model': 'mistral',
                    'prompt': prompt,
                    'stream': False,
                    'temperature': 0.3
                },
                timeout=30
            )
            if response.status_code == 200:
                return response.json()['response'].strip()
            else:
                return f"Error: Ollama respondió con {response.status_code}"
        except Exception as e:
            return f"Error al conectar con Ollama: {str(e)}"