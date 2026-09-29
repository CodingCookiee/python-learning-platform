from plp_fakes import ScriptedLLM, tool_call


def check_disk(host):
    return {"host": host, "free_gb": 3}


def restart_service(service):
    raise TimeoutError(f"{service} did not come back within 30s")


REGISTRY = {"check_disk": check_disk, "restart_service": restart_service}

llm = ScriptedLLM([
    tool_call("check_disk", host="web-2"),
    tool_call("restart_service", service="nginx"),
    [tool_call("check_disk", host="web-2"), tool_call("restart_service", service="nginx")],
    tool_call("finish", answer="web-2 is nearly out of disk, so nginx can't restart."),
])


def run(llm, max_steps):
    messages = [{"role": "user", "content": "web-2 is returning 502s"}]
    for step in range(1, max_steps + 1):
        response = llm.complete(messages, tools=[])
        if any(call.name == "finish" for call in response.tool_calls):
            return f"finished after {step} calls"
        messages.append({"role": "assistant", "content": response.text,
                         "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls]})
        for call in response.tool_calls:
            try:
                output = str(REGISTRY[call.name](**call.arguments))
                status = "ok"
            except Exception as error:
                output = f"error: {error}"
                status = output
            messages.append({"role": "tool", "tool_call_id": call.id, "content": output})
            print(f"step {step}: {call.name} {status}")
    return f"step_limit after {max_steps} calls"


print(run(llm, max_steps=3))
print("unused replies:", llm.remaining)
