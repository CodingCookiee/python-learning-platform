---
slug: io-cpu-and-the-gil
title: I/O-bound, CPU-bound and the GIL
summary: Waiting and working need different tools. Tell them apart, see what the GIL allows, and pick asyncio, threads or processes.
minutes: 35
exercises:
  - concurrency-io-or-cpu
  - concurrency-predict-interleaving
  - concurrency-pick-a-tool
  - concurrency-measure-job
---

A price checker visits 200 product pages, one after another, and takes 40 seconds. Profile it and
you find it spends about 39 of them doing nothing: each request goes out, and the program sits idle
until the shop's server answers. Making the Python faster would save almost nothing. Making it wait
for several pages *at once* would make it twenty times faster. Before you pick a tool for that,
you need to know which kind of slow you have.

## Waiting vs working

A job is **I/O-bound** when most of its time goes on waiting for something outside the CPU: a
network reply, a database query, a disk read. It's **CPU-bound** when the CPU is busy the whole
time: resizing images, parsing a huge file, hashing passwords, running a simulation.

You can tell them apart by comparing two clocks. `time.perf_counter()` measures **wall time**, the
time that passed on the clock on the wall. `time.process_time()` measures **CPU time**, the time
the CPU actually spent running your process. Waiting adds wall time but no CPU time.

```python norun
import time
import urllib.request

def timed(label, job):
    wall, cpu = time.perf_counter(), time.process_time()
    job()
    print(f"{label:<10} wall {time.perf_counter() - wall:.2f} s   cpu {time.process_time() - cpu:.2f} s")

timed("download", lambda: urllib.request.urlopen("https://www.python.org").read())
timed("hashing", lambda: [hash(str(n)) for n in range(3_000_000)])
```

```text
download   wall 0.41 s   cpu 0.02 s
hashing    wall 0.68 s   cpu 0.67 s
```

The download used 5% of its time on the CPU; the hashing used all of it. That ratio is the first
number to look at, and the first drill turns it into a function.

> [!NOTE]
> This example is shown rather than run because the browser has no network. There's a second
> reason: the browser's Python can't see a real CPU clock, so `time.process_time()` there counts
> waiting as if it were working. Run it on your machine to see the real split.

```quiz
question: A script reads 5,000 invoices from a database and totals them. It takes 12 s of wall time and 0.8 s of CPU time. Which is it?
options:
  - "CPU-bound: 12 seconds is a lot of work"
  - "I/O-bound: the CPU was idle for over 90% of the run"
  - "Neither: it's just slow"
answer: 1
explain: "0.8 / 12 is under 7%. The rest was waiting for the database, so overlapping the queries would help and a faster CPU wouldn't."
```

## Concurrency is not parallelism

These two words get mixed up, and the difference is the whole of this module:

- **Concurrency** is *dealing with* several things at once: starting a second download while the
  first one waits. One worker can do it, by switching between jobs whenever the current one is
  stuck.
- **Parallelism** is *doing* several things at once: two CPU cores each resizing a different
  image at the same instant. It needs more than one worker.

You already know a tool that can pause a function and resume it later: the generator (module 8).
Here is concurrency with nothing but generators. Each `yield` means "I'm waiting for the network,
let someone else run", and a loop takes turns:

```python
def download(name, chunks):
    for n in range(1, chunks + 1):
        print(f"{name}: chunk {n}/{chunks}")
        yield                    # waiting for the next chunk: let another download run
    print(f"{name}: done")

waiting = [download("invoice.pdf", 2), download("logo.png", 1), download("report.csv", 3)]
while waiting:
    job = waiting.pop(0)
    try:
        next(job)                # run it until it pauses again
        waiting.append(job)      # not finished: back of the line
    except StopIteration:
        pass                     # finished: drop it
```

One thread, three downloads in progress at once, and their output interleaved. Nothing ran in
parallel; the loop just never sat idle while one download waited. That loop is a tiny **event
loop**, and it's exactly how asyncio works, as the next lesson shows.

## Three tools

Python gives you three ways to run jobs concurrently:

| Tool | What runs your jobs | Switches between jobs | Good for |
|------|---------------------|------------------------|----------|
| **asyncio** | one thread, an event loop | only at `await`, when a job chooses to wait | lots of I/O: thousands of API calls, sockets, webhooks |
| **threads** | several threads in one process, sharing memory | whenever the interpreter decides | I/O with libraries that block, and CPU work on free-threaded Python |
| **processes** | several Python processes, each with its own memory | the operating system runs them side by side | CPU-bound work on a normal build of Python |

asyncio and threads give you concurrency. Processes give you parallelism, at a price: each one is
a separate Python interpreter, and every argument and result has to be copied between them.

> [!JS]
> Coming from JavaScript: asyncio is the model you know from Node and the browser, a single thread
> running an event loop. Processes are the closest thing to Web Workers: separate memory, and data
> that's copied across rather than shared.

## The GIL

Threads share memory, so why aren't they listed for CPU-bound work? Because of the **global
interpreter lock**, the GIL. In the standard build of CPython, a thread must hold the GIL to run
Python bytecode, and there's only one. However many threads you start, only one of them executes
Python at any moment; the others wait for their turn. The interpreter hands the GIL over every few
milliseconds, and whenever a thread starts waiting on I/O.

```python
import sys

# How often (in seconds) a running thread is asked to hand over the GIL,
# and whether this interpreter has one at all
sys.getswitchinterval(), sys._is_gil_enabled()
```

The GIL exists because of reference counting (module 11): every object's count changes
constantly, and one lock around the whole interpreter kept those updates safe and fast for
single-threaded code. The consequence:

- **I/O-bound threads work well.** A thread waiting for a socket releases the GIL, so other
  threads run. Ten threads can wait for ten downloads at once.
- **CPU-bound threads don't speed up.** Four threads hashing passwords take turns on one GIL, so
  they finish no sooner than one thread doing all four jobs, and often a little later.
- **C code can release it.** numpy, hashlib and zlib release the GIL while they crunch, so
  threads calling them can run in parallel. The limit applies to Python bytecode.

```python norun
import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

def count_primes(limit):
    return sum(all(n % d for d in range(2, int(n**0.5) + 1)) for n in range(2, limit))

def run(label, pool_class):
    start = time.perf_counter()
    with pool_class(max_workers=4) as pool:
        list(pool.map(count_primes, [200_000] * 4))
    print(f"{label:<10} {time.perf_counter() - start:.2f} s")

if __name__ == "__main__":
    start = time.perf_counter()
    [count_primes(200_000) for _ in range(4)]
    print(f"{'sequential':<10} {time.perf_counter() - start:.2f} s")
    run("threads", ThreadPoolExecutor)
    run("processes", ProcessPoolExecutor)
```

```text
sequential 3.21 s
threads    3.34 s
processes  0.93 s
```

Four threads were no faster than one loop. Four processes, each with its own interpreter and its
own GIL, used four cores. Lesson 6 covers these pools properly.

## Free-threaded Python

Since Python 3.13 there's a second build of CPython with no GIL, called **free-threaded** Python
(PEP 703). In 3.13 it was experimental; in 3.14 it's officially supported, though still an
optional extra rather than the default. Its executable has a `t` on the end: `python3.14t`.

```bash
uv python install 3.14t
uv run --python 3.14t cpu_demo.py
```

```text
GIL enabled: False
sequential 3.52 s
threads    0.98 s
processes  1.02 s
```

What it changes, and what it doesn't:

- **Threads run Python in parallel.** CPU-bound work in threads now uses every core, without the
  cost of copying data to other processes.
- **Single-threaded code is a little slower**, around 5–10% in 3.14, because reference counts and
  built-in types need thread-safe bookkeeping instead of one big lock.
- **Race conditions are still yours to prevent.** The GIL never made your own code safe: a thread
  could always be paused halfway through `balance = balance - amount`. Without it, those bugs just
  show up more often. You still need locks (lesson 7).
- **Extensions must opt in.** A C extension that hasn't declared itself safe without the GIL turns
  it back on when imported, with a warning. `sys._is_gil_enabled()` tells you which you've got.
- **asyncio is unchanged.** It never used more than one thread.

> [!TIP]
> Check the build in one line: `python -c "import sys; print(sys._is_gil_enabled())"`. `True` is a
> normal build (or a free-threaded one whose GIL an extension switched back on); `False` means
> threads really do run in parallel.

## Choosing a tool

With those facts, the choice mostly makes itself:

| The job is… | Reach for |
|-------------|-----------|
| One task, nothing to overlap | Plain sequential code. Concurrency only helps when there are several jobs. |
| I/O-bound, and the library has an async client (`httpx.AsyncClient`, `asyncpg`) | **asyncio** |
| I/O-bound, but the library only blocks (an old SDK, `requests`, a file-heavy script) | **threads** (or asyncio with `asyncio.to_thread` around the blocking call) |
| CPU-bound, on free-threaded Python | **threads** |
| CPU-bound, on a normal build | **processes** |

```quiz
question: A job resizes 2,000 product photos with pure-Python code, on a normal build of Python 3.14. Which tool makes it fastest?
options:
  - "asyncio, because it can run thousands of tasks"
  - "threads, because they share memory"
  - "processes, because each one has its own GIL"
answer: 2
explain: "It's CPU-bound, so asyncio and threads both run one job at a time (asyncio has one thread; threads share one GIL). Processes run on separate cores. On python3.14t, threads would work too."
```

## Do it on your machine

1. Save the prime-counting example above as `cpu_demo.py`, adding
   `print("GIL enabled:", sys._is_gil_enabled())` (and `import sys`) at the start of the
   `__main__` block. Run it with `uv run --python 3.14 cpu_demo.py` and note the three times.
2. Run it again with `uv run --python 3.14t cpu_demo.py`. The threads line should drop close to the
   processes line.
3. Change `count_primes` to `time.sleep(1)` and run both builds again. Now the job is I/O-bound:
   threads and processes both take about a second, and the build makes no difference.
4. Run `python -c "import os; print(os.cpu_count())"`. Try `max_workers` above that number: CPU-bound
   work stops getting faster once every core is busy.

## Where this leaves you

Compare CPU time with wall time to tell waiting from working. Concurrency overlaps waiting;
parallelism does work on several cores at once. asyncio and threads give you concurrency, processes
give you parallelism, and free-threaded Python lets threads do both. The drills classify jobs,
predict an interleaving loop, choose the right tool and measure a job.
