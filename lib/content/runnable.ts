/**
 * Which lesson examples get a Run button. Shared by the lesson renderer and
 * content:validate (which runs every runnable example to catch broken ones).
 */

/** Pyodide's standard library plus the packages it ships (loaded on first import) */
const BROWSER_MODULES = new Set(
  (
    // Standard library
    "__future__ abc argparse array ast asyncio base64 bisect builtins calendar cmath collections " +
    "colorsys contextlib contextvars copy csv dataclasses datetime decimal difflib dis doctest email " +
    "enum errno fnmatch fractions functools gc getopt glob graphlib gzip hashlib heapq hmac html http " +
    "inspect io ipaddress itertools json keyword linecache locale logging math mimetypes numbers " +
    "operator os pathlib pickle platform pprint queue random re reprlib sched secrets shlex shutil " +
    "signal sqlite3 statistics string struct sys tempfile textwrap time timeit tokenize tomllib " +
    "traceback types typing unicodedata unittest urllib uuid warnings weakref zipfile zlib zoneinfo " +
    // Pyodide packages
    "numpy pandas pydantic httpx sqlalchemy fastapi starlette pytest bs4 yaml jinja2 rich attrs " +
    "dateutil pytz regex tiktoken sklearn scipy matplotlib"
  ).split(" ")
);

/** Importable modules only, and no input() (examples have no input box). */
export function isBrowserRunnable(code: string): boolean {
  const imports = [...code.matchAll(/^\s*(?:from|import)\s+([A-Za-z_]\w*)/gm)].map((m) => m[1]!);
  if (imports.some((m) => !BROWSER_MODULES.has(m))) return false;
  return !/\binput\(/.test(code);
}
