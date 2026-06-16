def retrieve_context(query: str) -> list[str]:
    """
    Función puente (Wrapper) para mantener compatibilidad con voice/router.py y chat/router.py.
    Retorna una lista vacía porque la nueva arquitectura de LangChain (agente agéntico) 
    se encarga de hacer su propio retrieval mediante Tools cuando lo considera necesario.
    """
    return []
