// Runner support for multi-file drills, in the Node Pyodide pool
import { PyodidePool } from "../scripts/content/pyodide-pool.mjs";

const pool = new PyodidePool({ root: process.cwd(), size: 1 });
let failures = 0;
const check = (label, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== undefined ? " " + JSON.stringify(detail).slice(0, 300) : ""}`);
};

const tests = `from plp import test
from solution import order_total

@test("adds tax")
def _():
    assert order_total([10, 20]) == 33.0
`;
const main = `from pricing import with_tax\n\ndef order_total(prices):\n    return with_tax(sum(prices))\n`;

let r = await pool.run({ kind: "test", solution: main, tests, files: { "pricing.py": "def with_tax(x):\n    return round(x * 1.1, 2)\n" }, mainName: "main.py" }, 20000);
check("imports a helper module", r.status === "ok" && r.passed, r.tests);

r = await pool.run({ kind: "test", solution: main, tests, files: { "pricing.py": "def with_tax(x):\n    return x / 0\n" }, mainName: "main.py" }, 20000);
check("error in the helper names pricing.py", !r.passed && /pricing\.py/.test(r.tests?.[0]?.error?.traceback ?? ""), r.tests?.[0]?.error?.traceback);

r = await pool.run({ kind: "test", solution: main, tests, files: { "pricing.py": "def with_tax(x):\n    while True:\n        pass\n" }, mainName: "main.py" }, 20000);
check("time limit catches a loop in the helper", !r.passed && /longer than/.test(r.tests?.[0]?.message ?? ""), r.tests?.[0]?.message);

const pkgMain = `from inventory import reorder\nfrom inventory.stock import LEVELS\n\ndef low():\n    return reorder(LEVELS)\n`;
const pkgTests = `from plp import test\nfrom solution import low\n\n@test("low stock")\ndef _():\n    assert low() == ["tea"]\n`;
r = await pool.run({
  kind: "test", solution: pkgMain, tests: pkgTests, mainName: "main.py",
  files: {
    "inventory/__init__.py": "from inventory.stock import reorder\n",
    "inventory/stock.py": "LEVELS = {'tea': 1, 'milk': 9}\n\ndef reorder(levels):\n    return [k for k, v in levels.items() if v < 3]\n",
  },
}, 20000);
check("packages with submodules", r.status === "ok" && r.passed, r.error ?? r.tests);

r = await pool.run({ kind: "run", code: "import csv\nwith open('orders.csv') as f:\n    print(sum(int(row['qty']) for row in csv.DictReader(f)))\n", files: { "orders.csv": "sku,qty\na,2\nb,5\n" } }, 20000);
check("data files are readable", r.status === "ok" && r.stdout.trim() === "7", r);

r = await pool.run({ kind: "test", solution: main, tests }, 20000);
check("a later run doesn't see the old files", r.status === "error" && /pricing/.test(r.error?.message ?? ""), r.error?.message);

r = await pool.run({ kind: "run", code: "import os\nprint(os.path.exists('orders.csv'))" }, 20000);
check("data files are cleaned up", r.stdout.trim() === "False", r.stdout);

await pool.close();
console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`);
process.exit(failures ? 1 : 0);
