"""
Bridge function for backward compatibility.

The new LangChain agent architecture handles its own retrieval via tools,
so this function always returns an empty list. It exists to maintain
compatibility with voice/router.py and chat/router.py call signatures.
"""


def retrieve_context(query: str) -> list[str]:
    """
    Wrapper function for backward compatibility with voice/router.py and chat/router.py.

    Returns an empty list because the new LangChain agent architecture
    handles its own retrieval via tools when needed.
    """
    return []
