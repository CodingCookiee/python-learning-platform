import tempfile
from pathlib import Path

log = Path(tempfile.mkdtemp()) / "orders.log"

with open(log, "w", encoding="utf-8") as file:
    file.write("A1001 paid\n")
with open(log, "a", encoding="utf-8") as file:
    file.write("A1002 paid\n")
    file.write("A1003 refunded")
print(log.read_text(encoding="utf-8").splitlines())

with open(log, "w", encoding="utf-8") as file:
    print(file.write("café\n"))
print(len(log.read_text(encoding="utf-8")), len(log.read_bytes()))

try:
    with open(log, "x", encoding="utf-8") as file:
        file.write("A1004 paid\n")
except FileExistsError:
    print("x kept", log.read_text(encoding="utf-8").strip())
