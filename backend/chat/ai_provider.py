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
        prompt = f"""You are a SQL expert. Given a database schema and a question in natural language, generate a valid SQL query.
Return ONLY the SQL query (no markdown, no explanation).

Rules:
- Always query the table named: data
- Only generate SELECT queries
- Quote column names using double quotes if needed
- Never return placeholders like 'table_name'

Schema:
{schema}

Examples:
- "¿Cuál es la categoría más vendida?" -> SELECT product_category, SUM(quantity) as total FROM data GROUP BY product_category ORDER BY total DESC LIMIT 1
- "¿Cuál es el valor medio de venta?" -> SELECT AVG(total_sale) FROM data
- "¿Cuántas órdenes hay?" -> SELECT COUNT(*) FROM data

Question: {question}

SQL:"""

        if self.env == 'production' and self.client:
            return self._generate_with_groq(prompt)
        else:
            return self._generate_with_ollama(prompt)
    
    def answer_question(self, question: str, context: str) -> str:
        """Responde una pregunta con contexto de datos"""
        prompt = f"""You are a data analyst assistant. Answer the user's question based on the data context provided.
Be concise and professional. Provide insights if relevant.

Data Context:
{context}

Question: {question}

Answer:"""
        
        if self.env == 'production' and self.client:
            return self._generate_with_groq(prompt)
        else:
            return self._generate_with_ollama(prompt)
    
    def _generate_with_groq(self, prompt: str) -> str:
        """Usa Groq API"""
        try:
            if not self.client:
                return "Error: Groq no inicializado"
            
            completion = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
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