---
slug: running-python
title: Running Python
summary: Three ways to run Python, what the interpreter does with your file, and why indentation is syntax.
minutes: 20
exercises:
  - hello-pylearn
  - fix-the-indentation
  - predict-print-arguments
---

Python code is read by a program called the **interpreter**. It reads your file top to bottom, runs
each statement as it gets to it, and stops at the first error. There is no build step and no `main()`
you have to write. That's why Python is quick to start with, and it's worth knowing exactly what
happens when you press Run.

## The REPL, a script, and this page

There are three places you'll run Python in this course:

1. **The REPL** (read–eval–print loop). Type `python` in a terminal (or `uv run python` inside a
   project) and you get a `>>>` prompt. Each line runs as soon as you press Enter, and the value of an
   expression is printed back to you. It's the best calculator you'll ever own, and the fastest way to
   check what a piece of Python does.
2. **A script.** Save code in `hello.py` and run `python hello.py`. Nothing is printed unless you
   call `print()`.
3. **The browser.** Every example on this site runs in real Python (CPython compiled to WebAssembly)
   inside your browser. Press **Run** on the block below.

```python
print("Hello from Python")
2 + 3 * 4
```

The block printed one line and then showed `14` as a value. It behaves like the REPL: the value of
the last line is shown for you. A script would only show the printed line.

> [!JS]
> Coming from JavaScript: `print()` is Python's `console.log()`. There is no `;` at the end of a
> line, and no `let`/`const`: assigning a name creates it.

## Statements run in order

The interpreter runs your file one statement at a time. A statement that fails stops everything
after it, so the line number in an error message tells you exactly how far the program got.

```python raises
print("step 1: load the order")
print("step 2: add the tax")
print("step 3: " + 42)
print("step 4: print the receipt")
```

Run it. Steps 1 and 2 print, then Python reports a `TypeError` on line 3 (you can't add text and a
number) and step 4 never runs. Read error messages from the bottom up: the last line names the
problem, the lines above say where it happened.

## Indentation is syntax

Most languages use braces to group lines into a block. Python uses indentation: the lines that belong
to an `if`, a loop or a function are indented under it, by **four spaces** by convention.

```python
total = 120

if total > 100:
    print("Free shipping")
    print("Order qualifies")
print("Done")
```

The two indented lines belong to the `if`; `Done` always prints. Change `total` to `80` and run it
again. The colon at the end of `if total > 100:` is required: it says "a block starts here".

> [!WARNING]
> Mixing tabs and spaces, or indenting one line by three spaces and the next by four, is a syntax
> error in Python. Let your editor insert four spaces when you press Tab (every editor on this site
> already does).

## Comments and print

`#` starts a comment that runs to the end of the line. `print()` takes any number of values, puts a
space between them, and ends with a newline. Both of those are adjustable with `sep` and `end`.

```python
# Values are separated by a space by default
print("Order", 1042, "shipped")

# sep replaces the space, end replaces the newline
print("2026", "09", "25", sep="-")
print("Loading", end="... ")
print("done")
```

```quiz
question: What does `print("a", "b", sep="")` print?
options:
  - "a b"
  - "ab"
  - "a\nb"
answer: 1
explain: sep is the text placed between values. An empty string means nothing goes between them.
```

## Where this leaves you

You can run Python three ways, read an error message from the bottom up, and structure code with
indentation. The drills below practise exactly that, and the next lesson explains what a variable
really is in Python, which is less obvious than it looks.
