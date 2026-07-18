"""
Prompt Library - Built-in prompts for common analytics tasks.

Provides curated, tested prompts for different analysis domains.
"""

from app.services.ai_gateway.prompts.library import PromptLibrary, get_prompt_library

__all__ = [
    "PromptLibrary",
    "get_prompt_library",
]