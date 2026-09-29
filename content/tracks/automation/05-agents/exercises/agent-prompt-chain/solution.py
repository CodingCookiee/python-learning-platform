def run_chain(llm, steps: list[str], text: str, *, system: str | None = None) -> str:
    """Run each prompt template in turn, feeding each reply into the next."""
    current = text
    for step in steps:
        prompt = step.replace("{input}", current)
        current = llm.complete([{"role": "user", "content": prompt}], system=system).text.strip()
    return current
