---
slug: start-what-a-program-is
title: What a program is
summary: A program is a list of instructions the computer follows in order. Write your first one, and learn to read the message Python shows when something goes wrong.
minutes: 40
exercises:
  - start-say-hello
  - start-predict-the-order
  - start-print-a-receipt
  - start-fix-the-missing-quote
  - start-fix-the-capital-letter
  - start-predict-with-comments
  - start-cinema-tickets
---

A **program** is a list of instructions for a computer, written down so it can follow them. It's like
a recipe: "boil the water, add the pasta, wait ten minutes". The computer is a very fast, very literal
cook. It does exactly what each instruction says, in the order you wrote them, and nothing else. It
never guesses what you meant.

The instructions are written in a **programming language**: a small set of words and symbols the
computer understands. This course uses **Python**, one of the most popular languages in the world and
one of the easiest to read. You don't need to install anything. Every example on this page runs in
your browser.

## Your first instruction

Here is a complete Python program. It has one instruction. Press **Run** under it.

```python
print("Hello!")
```

You should see `Hello!` appear underneath. That's your first program.

Let's take it apart:

- `print` is the instruction. It tells Python to show something on the screen. (Programmers say
  "print" for "show", from the days when results came out on paper.)
- The round brackets `( )` hold what you want printed.
- The quote marks `" "` mark the start and end of a piece of **text**. Python shows the text between
  them exactly as written, but not the quote marks themselves.

Try changing the words inside the quotes and pressing **Run** again. You can't break anything here:
each run starts fresh.

```python
print("My name is Ada and I'm learning Python.")
```

> [!TIP]
> Programmers call a piece of text a **string**, short for "a string of characters". You'll see that
> word a lot. It just means text.

## Instructions run from top to bottom

A program can have as many instructions as you like, one per line. Python runs them one at a time,
starting at the top.

```python
print("Boil the water.")
print("Add the pasta.")
print("Wait ten minutes.")
```

Swap two of those lines and run it again: the output comes out in the new order. The computer doesn't
know that boiling comes before adding pasta. It only knows the order you gave it.

```quiz
question: In what order will these lines be printed? `print("C")`, then `print("A")`, then `print("B")`
options:
  - "A, B, C"
  - "C, A, B"
  - "It depends on the computer"
answer: 1
explain: Python always runs instructions from top to bottom, exactly as written. It never sorts or rearranges them.
```

## Text and numbers

`print` can show numbers too, and numbers don't need quote marks. Python can also do arithmetic for
you: `+` adds, `-` subtracts, `*` multiplies (the star is the computer's times sign) and `/` divides.

```python
print(12)
print(3 + 4)
print(6 * 7)
```

You can print several things at once by separating them with commas. Python puts a space between them.

```python
print("Two coffees cost", 2 * 3.5)
```

Watch the difference the quote marks make. Without them, `3 + 4` is a sum that Python works out. With
them, `"3 + 4"` is just text, and Python prints it exactly as it is.

```python
print(3 + 4)
print("3 + 4")
```

```quiz
question: What does `print("10 * 2")` show?
options:
  - "20"
  - "10 * 2"
  - "An error"
answer: 1
explain: The quote marks make it text, so Python shows it as written. Without the quotes, print(10 * 2) would show 20.
```

> [!NOTE]
> Python writes decimals with a dot: `3.5`, not `3,5`. A comma means "and here's the next thing to print".

## Mistakes are normal: reading an error message

Every programmer makes mistakes, all day long. The difference between a beginner and an experienced
programmer isn't that the experienced one makes fewer mistakes. It's that they read the error message
straight away, because it usually says exactly what's wrong.

This program forgets the closing quote mark. Press **Run** and look at what Python says.

```python raises
print("Hello!)
```

Python stops and shows an **error message** instead of running anything. Read it from the bottom up:

- The **last line** says what kind of problem it is. `SyntaxError` means "I can't understand how this
  is written", like a sentence with a missing full stop. Python adds a short description too.
- The lines above it point to **where** the problem is: a line number, and often a little `^` under
  the spot it noticed.

Here's another common one. Python cares about capital letters: `print` and `Print` are different
words to it, and only one of them is an instruction it knows.

```python raises
Print("Hello!")
```

This time the last line says `NameError`, which means "you used a name I don't know". The message even
includes the name it didn't recognise: `Print`.

> [!TIP]
> When something goes wrong, read the last line of the error first, then look at the line it points
> to. Most beginner mistakes are a missing quote mark or bracket, or a word with the wrong capital
> letter.

```quiz
question: "Python says `NameError: name 'pront' is not defined`. What is the most likely fix?"
options:
  - "Add quote marks around pront"
  - "Change pront to print"
  - "Restart the computer"
answer: 1
explain: A NameError means Python doesn't know the word. Here it's a typo for print, so fixing the spelling fixes the program.
```

## Notes for humans: comments

Sometimes you want to leave a note in your program for yourself, or for the next person who reads it.
Start a line with `#` and Python ignores everything after it on that line. These notes are called
**comments**.

```python
# Prices for the breakfast order
print("Toast:", 2.5)
# print("Eggs:", 3)    <- turned off for now
print("Tea:", 1.8)
```

Only two lines are printed. The line with `Eggs` starts with `#`, so it's a comment, and Python skips
it. Putting `#` in front of a line is a quick way to switch it off without deleting it.

## What you can do now

You've written programs that show text and numbers, run in order from top to bottom, and do arithmetic.
You've read two kinds of error message and know where to look first. Next, you'll learn to keep values
under names, so your programs can remember things.

The drills below are short and practical. If you get stuck, every drill has hints, and it's fine to use
them.
