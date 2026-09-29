SYSTEM = 300      # tokens in the system prompt and tool definitions
TASK = 50         # "Research Harbour Dental before tomorrow's call"
PER_STEP = 200    # one tool call and its result, added to the history each step

history = SYSTEM + TASK
total_input = 0
for step in range(1, 5):
    total_input += history
    print(f"step {step}: sends {history}")
    history += PER_STEP

print("agent total:", total_input)
print("workflow total:", SYSTEM + TASK + 3 * PER_STEP)
