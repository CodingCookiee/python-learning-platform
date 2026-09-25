import re

log = "GET /cart 200 12ms, POST /pay 502 340ms, GET /home 200 8ms"

print(re.findall(r"\d+ms", log))
print(re.findall(r"(\w+) (/\w+)", log))
print(re.findall(r"/(\w+) (\d{3})", log)[1])
print(re.sub(r"\d+ms", "?", log, count=1))
print(re.search(r"<(.+)>", "<b>bold</b>").group(1))
print(re.search(r"<(.+?)>", "<b>bold</b>").group(1))
