import importlib
import runpy
import shutil
import sys
import tempfile
from pathlib import Path

project = Path(tempfile.gettempdir()) / "invoicer-project"

# Start from a clean slate, in case an earlier run left its project behind
shutil.rmtree(project, ignore_errors=True)
sys.path[:] = [entry for entry in sys.path if not entry.startswith(str(project))]
for name in [name for name in sys.modules if name.split(".")[0] == "invoicer"]:
    del sys.modules[name]

# Build a src-layout project in a temporary folder
package = project / "src" / "invoicer"
package.mkdir(parents=True)
(package / "__init__.py").write_text('__version__ = "0.3.0"\nprint("init runs, __name__ =", __name__)\n')
(package / "cli.py").write_text(
    "from invoicer import __version__\n"
    "print('cli runs, __name__ =', __name__)\n"
    "\n"
    "def main():\n"
    "    print('invoicer', __version__)\n"
    "    return 0\n"
)
(package / "__main__.py").write_text("from invoicer.cli import main\n\nraise SystemExit(main())\n")
importlib.invalidate_caches()

# 1. With only the project root on sys.path, as when you run python from that folder
sys.path.insert(0, str(project))
try:
    import invoicer
except ModuleNotFoundError as error:
    print("from the project root:", error)

# 2. With src/ on sys.path, which is what installing the package achieves
sys.path.insert(0, str(project / "src"))
from invoicer.cli import main

print("main() returned", main())

# 3. What python -m invoicer does
try:
    runpy.run_module("invoicer", run_name="__main__")
except SystemExit as exit:
    print("exit status", exit.code)
