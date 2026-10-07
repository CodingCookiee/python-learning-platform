---
slug: start-making-decisions
title: Making decisions
summary: Programs can choose what to do. Ask yes-or-no questions with comparisons, then use if, elif and else to act on the answer.
minutes: 40
exercises:
  - start-predict-true-or-false
  - start-free-delivery
  - start-fix-the-equals-sign
  - start-fix-the-indentation
  - start-predict-first-match
  - start-coffee-sizes
  - start-ride-check
  - start-ticket-prices
---

So far, every program you've written runs every line, from top to bottom, every time. Real life isn't
like that. A shop gives free delivery only when you spend enough. A cinema charges a child less than an
adult. A game says "New high score!" only when you've beaten the old one. In each case, something
happens only **if** a condition is met.

This lesson shows how a program makes that kind of choice. It takes two pieces: a question with a
yes-or-no answer, and an instruction that acts on the answer.

## Yes-or-no questions: comparisons

A **comparison** checks two values against each other and answers yes or no. `5 > 3` asks "is 5
greater than 3?" Press **Run** to see Python's answers.

```python
print(5 > 3)
print(2 > 10)
```

Python answers with one of two special values: `True` for yes and `False` for no. They're values, like
numbers and text, but there are only these two. They start with a capital letter and have no quote
marks.

Python has six comparisons:

| Symbol | Asks | Example | Answer |
|--------|------|---------|--------|
| `==` | is equal to? | `4 == 4` | `True` |
| `!=` | is not equal to? | `4 != 4` | `False` |
| `<` | is less than? | `3 < 10` | `True` |
| `>` | is greater than? | `3 > 10` | `False` |
| `<=` | is less than or equal to? | `18 <= 18` | `True` |
| `>=` | is greater than or equal to? | `17 >= 18` | `False` |

The symbols with two characters are typed as two keys, with no space between them: `>=`, never `> =`.
In `!=`, the `!` means "not".

Comparisons get useful when they're about a name, because the answer depends on the value stored in it.
Run this, then change `15` to `20` and run it again.

```python
age = 15
print(age >= 13)
print(age >= 18)
```

You can compare text too. `==` asks whether two pieces of text are exactly the same, capital letters
included:

```python
print("tea" == "tea")
print("Tea" == "tea")
print("tea" != "coffee")
```

> [!TIP]
> Programmers call `True` and `False` **Booleans**, after George Boole, a mathematician who worked out
> the rules of yes-or-no logic in the 1800s. You'll see the word often. It just means "True or False".

```quiz
question: What does `print(10 <= 10)` show?
options:
  - "True"
  - "False"
  - "An error"
answer: 0
explain: "<= asks whether the first number is less than or equal to the second. 10 isn't less than 10, but it is equal to it, so the answer is True."
```

## One equals sign stores, two compare

You met `=` in an earlier lesson: it stores a value under a name. Asking whether two values are equal
needs a different symbol, `==`: two equals signs, with no space between them. Say them differently in
your head:

- `tickets = 4` says "tickets **becomes** 4". It's an instruction, and it changes something.
- `tickets == 4` asks "**is** tickets equal to 4?" It's a question. It changes nothing, and the answer
  is `True` or `False`.

```python
tickets = 4
print(tickets == 4)
print(tickets == 5)
print(tickets)
```

The last line shows that asking didn't change anything: `tickets` is still 4.

One more thing to watch. A number and a piece of text are never equal, even when they look the same:

```python
print(18 == 18)
print("18" == 18)
```

That matters because `input()` always gives back text. If you compare the answer with a number before
turning it into one, `==` quietly says `False`, and comparisons such as `>=` stop the program with an
error:

```python raises
age = "15"      # what input() gives back when someone types 15
print(age >= 18)
```

`TypeError` means a value is the wrong kind for the job: Python can't say whether a piece of text is
bigger than a number. The fix is the one you already know. Turn the answer into a number with `int()` as
soon as you read it: `age = int(input("How old are you? "))`.

```quiz
question: Which line asks whether `score` is equal to 100?
options:
  - "score = 100"
  - "score == 100"
  - "score =< 100"
answer: 1
explain: "Two equals signs ask a question. One equals sign stores 100 under the name score, and =< isn't a Python symbol at all (less than or equal to is written <=)."
```

## Acting on the answer: `if`

Now put a question to work. An **if statement** runs some lines only when a **condition** is `True`. A
**statement** is one complete instruction, and a condition is anything that answers `True` or `False`,
such as a comparison.

```python
score = 120

if score > 100:
    print("New high score!")
    print("Your name goes on the leaderboard.")

print("Game over")
```

Let's take it apart:

- `if` is followed by the condition, then a colon `:`. The colon means "here's what to do".
- The lines that belong to the `if` are **indented**: pushed in from the left by four spaces. Together
  they form a **block**, a group of lines that run together, or not at all.
- `print("Game over")` isn't indented, so it isn't part of the `if`. It runs every time.

The spaces aren't decoration: they're how Python knows which lines belong to the `if`. Moving a line in
or out changes what the program does. Before you run this one, guess what it prints:

```python
money = 3

if money >= 5:
    print("You buy a sandwich.")
    print("Enjoy your lunch!")
print("Off to the park.")
```

With 3 in your pocket the condition is `False`, so both indented lines are skipped and you only see
`Off to the park.` Now delete the four spaces in front of `print("Enjoy your lunch!")` and run it again.
That line has left the `if`, so it runs every time, sandwich or not.

> [!TIP]
> In the drills, the editor helps with the spaces: press Enter after a line that ends with a colon, and
> the next line is indented for you. In the examples on this page, type the four spaces yourself. Every
> line in the same block must be indented by the same amount.

## When an `if` won't run: reading the error

Three slips catch everyone at first. Each one stops the program before it runs anything, with a message
that says what to fix. Run each example and, as always, read the last line first.

**A missing colon.** The last line is `SyntaxError: expected ':'`, and the little `^` points at the spot
where the colon belongs.

```python raises
money = 8

if money >= 5
    print("You buy a sandwich.")
```

**Nothing indented under the `if`.** An **IndentationError** is a mistake in the spaces at the start of
a line. This one says `IndentationError: expected an indented block after 'if' statement on line 3`: the
`if` on line 3 has nothing pushed in under it. Indent the `print` line by four spaces and the program
runs. (You may also meet `IndentationError: unexpected indent`, the opposite slip: a line pushed in when
nothing above it ends with a colon.)

```python raises
money = 8

if money >= 5:
print("You buy a sandwich.")
```

**One equals sign instead of two.** The last line is `SyntaxError: invalid syntax. Maybe you meant '=='
or ':=' instead of '='?`, which hands you the fix: inside an `if` you're asking a question, so you need
`==`. Ignore the `:=` suggestion; it's a different tool that you won't need here.

```python raises
money = 5

if money = 5:
    print("Exactly enough for a sandwich.")
```

## Otherwise: `else`

Often you want one thing to happen when the answer is yes, and something different when it's no.
`else` (meaning "otherwise") gives an `if` a second block, which runs only when the condition is
`False`. Exactly one of the two blocks runs: never both, and never neither.

Here's a program for a café's loyalty card. It asks how many points you have:

```python norun
points = int(input("How many points do you have? "))

if points >= 100:
    print("You've earned a free coffee!")
else:
    print("Only", 100 - points, "points to go.")
```

```text
How many points do you have? 85
Only 15 points to go.
```

`else` lines up with its `if`, ends with a colon, and has no condition of its own: it catches every case
the `if` didn't.

Examples on this page can't ask you questions, which is why that one has no **Run** button. In the
drills you type your answers in the **Input for Run** box, one per line. Here, a plain number stands in
for the answer. Run it, then try `100` and `120`.

```python
points = 85     # stands in for the answer typed into input()

if points >= 100:
    print("You've earned a free coffee!")
else:
    print("Only", 100 - points, "points to go.")
```

## More than two choices: `elif`

Some decisions have more than two outcomes. For those, add `elif` (short for "else if") between the
`if` and the `else`. Each `elif` asks another question, but only when every question above it got
`False`.

```python
temperature = 18     # in degrees Celsius

if temperature >= 25:
    print("It's hot. A T-shirt will do.")
elif temperature >= 15:
    print("It's mild. Bring a light jacket.")
else:
    print("It's cold. Wear a coat.")
```

Python checks the conditions from the top down. It runs the block of the **first** one that's `True`,
then skips the rest of the `if`, `elif` and `else`. At 30 degrees, `temperature >= 25` and
`temperature >= 15` are both `True`, but you only get the T-shirt advice, because that question comes
first. So the order matters: here, the hottest case has to be checked first.

You can have as many `elif` lines as you need, and the `else` is optional: leave it out when nothing
should happen if no condition is `True`.

Run the example with the temperature at `30`, `15` and `5`. Before each run, guess the answer. Is 15
mild or cold?

## Combining questions: `and`, `or` and `not`

Sometimes one comparison isn't enough. Python has three words for combining conditions:

- `and` is `True` only when the conditions on **both** sides are `True`.
- `or` is `True` when **at least one** side is `True`.
- `not` flips a single condition: `True` becomes `False`, and `False` becomes `True`.

`and` is how you ask whether a value is between two others. Is this person a teenager, aged 13 to 19?
Try `12`, `13`, `19` and `20`.

```python
age = 16

if age >= 13 and age <= 19:
    print("You're a teenager.")
else:
    print("You're not a teenager.")
```

`or` suits "either of these will do":

```python
day = "Sunday"

if day == "Saturday" or day == "Sunday":
    print("Weekend: the café opens at 10.")
else:
    print("Weekday: the café opens at 8.")
```

> [!WARNING]
> Each side of `and` or `or` must be a complete question. `day == "Saturday" or "Sunday"` looks right,
> but Python reads it as two separate things: the question `day == "Saturday"`, and the word `"Sunday"`
> on its own, which isn't a question at all. Python counts a word on its own as a yes, so every day of
> the week becomes the weekend. Write `day == "Saturday" or day == "Sunday"`.

`not` is handy with a name that holds `True` or `False`. A name can store these just like it stores
numbers and text. Read `not is_member` as "is not a member", then change `False` to `True` and run it
again.

```python
is_member = False

if not is_member:
    print("Join our loyalty club and collect points!")
```

```quiz
question: Which condition is True for every age from 13 to 19, and for no other age?
options:
  - "age >= 13 and age <= 19"
  - "age >= 13 or age <= 19"
  - "age > 13 and age < 19"
answer: 0
explain: "With or, every age passes: 5 is at most 19, and 50 is at least 13. The third option leaves out 13 and 19 themselves, because > and < don't include the number you compare with."
```

## What you can do now

Your programs can ask questions and act on the answers. Comparisons give `True` or `False`. `if`,
`elif` and `else` choose which lines run, and indentation shows which lines belong to which block.
`and`, `or` and `not` combine questions. You've also read three new error messages: a missing colon,
an `IndentationError`, and one equals sign where you needed two.

The drills finish with a small project: a ticket-price rule for a zoo, with different prices for
children, adults and seniors. Whenever a program makes a decision, test it right on the edges, such as
exactly 12 and exactly 13: that's where decisions most often go wrong. Every drill has hints if you get
stuck, and it's fine to use them.
