"""
Motor principal del Agente usando LangChain puro.
"""
from langchain_openai import ChatOpenAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from config import OPENAI_API_KEY, LLM_MODEL
from rag.tools import buscar_manuales_tecnicos, diagnosticar_falla_mecanica

# 1. Configurar Herramientas y LLM
tools = [buscar_manuales_tecnicos, diagnosticar_falla_mecanica]
llm = ChatOpenAI(model=LLM_MODEL, api_key=OPENAI_API_KEY, temperature=0.1)

# 2. Definir el Prompt
AGENT_SYSTEM_PROMPT = """Eres Pegasus, un mecánico experto de Auteco Mobility y un agente de inteligencia artificial autónomo.

Tu misión es resolver las dudas de los usuarios. Para lograrlo, TIENES ACCESO A HERRAMIENTAS:
1. `buscar_manuales_tecnicos`: Úsala cuando te pregunten datos técnicos, mantenimientos o especificaciones de los PDF.
2. `diagnosticar_falla_mecanica`: Úsala SOLAMENTE cuando el usuario te reporte una avería, falla, problema, o ruido anormal.

REGLAS DE ORO:
- NUNCA intentes responder de memoria. SIEMPRE usa tus herramientas para consultar la base de datos antes de responder datos técnicos.
- EXIGE EL MODELO DE LA MOTOCICLETA: Si el usuario no te dice de qué moto está hablando, pregúntaselo antes de usar ninguna herramienta. Es imposible diagnosticar o dar especificaciones sin saber el modelo.
- MANEJO DE ERRORES ORTOGRÁFICOS: Si el usuario escribe mal el nombre de la moto (ej. "veneli" en vez de "Benelli", "puzar" en vez de "Pulsar"), deduce el nombre correcto por similitud fonética y úsalo para buscar en tus herramientas.
- SÉ EXTREMADAMENTE BREVE Y CONCISO. No des explicaciones largas.
"""

prompt = ChatPromptTemplate.from_messages([
    ("system", AGENT_SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="chat_history"),
    ("user", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

# 3. Crear el Agente y su Ejecutor
agent = create_tool_calling_agent(llm, tools, prompt)
pegasus_agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
