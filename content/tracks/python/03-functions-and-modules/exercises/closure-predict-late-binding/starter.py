handlers = {}
for level in ["info", "warning", "error"]:
    handlers[level] = lambda message: f"[{level.upper()}] {message}"

print(handlers["info"]("started"))
print(handlers["warning"]("disk 91% full"))

fixed = {}
for level in ["info", "warning", "error"]:
    fixed[level] = lambda message, level=level: f"[{level.upper()}] {message}"

print(fixed["info"]("started"))

level = "debug"
print(handlers["error"]("crashed"))
print(fixed["error"]("crashed"))
