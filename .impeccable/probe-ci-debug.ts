import { parse as parseYaml } from "yaml";
import { workflowYaml } from "../lib/ci/workflow";
const y = workflowYaml({ origin: "http://localhost:3000", token: "-abc_DEF123456789xyz", title: "Receipt printer" });
const p = parseYaml(y) as any;
console.log(JSON.stringify({ env: p.jobs?.pylearn?.env, steps: p.jobs?.pylearn?.steps?.length, on: p.on ?? p[true as any] }));
