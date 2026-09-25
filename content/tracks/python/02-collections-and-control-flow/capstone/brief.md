A school's teachers keep their marks in whatever they have to hand: a spreadsheet one term, a notes
app the next. At the end of term, someone pastes all of it into one long list of lines, and somebody
else has to turn that into a report. Typos, missing fields and "abc" instead of a score included.

You'll write `gradebook.py`, a program that reads those raw lines and prints a clean report: how each
student did, how each subject went, and which lines it had to skip and why. It uses everything in
this module: parsing with unpacking or `match`, grouping with dicts, de-duplicating and comparing with
sets, sorting, loops and comprehensions.

## The input

The program reads lines with `input()` until it reads a blank line. Each line should be a student's
name, a subject and a score, separated by commas:

```text
Ada, Maths, 91
Grace, physics, 88
```

- **Spaces around each field don't matter**, and neither does case: `ada`, ` Ada ` and `ADA` are the
  same student. Show names and subjects in title case (`"ada".title()` is `"Ada"`).
- **A score is a whole number from 0 to 100.** A student can have several scores in the same subject
  (a retake, a second assignment). Every score counts.
- **Lines are numbered from 1**, counting every line read before the blank line, valid or not.

A line is **skipped**, never fatal, if:

| Problem | Reason to report |
|---------|------------------|
| It doesn't have exactly three comma-separated fields | `expected name, subject, score` |
| The name or the subject is empty | `name or subject is missing` |
| The score isn't a whole number (`abc`, `-5`, `87.5`) | `score is not a whole number` |
| The score is over 100 | `score is over 100` |

Check the problems in that order and report the first one that applies.

## The report

The report has a one-line summary and then up to three sections, separated by blank lines.

**Summary.** `Gradebook: N scores, N students, N subjects`, counting only valid lines.

**STUDENTS**, one row per student:

- the number of scores they have, and their **average** over all of them, to one decimal place;
- their **letter grade**, from the unrounded average: A for 90 and above, B for 80 and above, C for
  70 and above, D for 60 and above, and F below 60;
- their **best subject**: the subject where their own average is highest. If two subjects tie, use
  the one that comes first alphabetically.

Sort students by average, highest first. Students with equal averages are sorted by name.

**SUBJECTS**, one row per subject, sorted alphabetically: the number of scores, the average to one
decimal place, the lowest and highest score, and the **top student**, whose own average in that
subject is highest (ties go to the alphabetically first name).

**SKIPPED (N)**, only if any lines were skipped: one row per skipped line, in input order, as
`line 4: "Linus, Maths, abc" (score is not a whole number)`. Show the line with the spaces at its
ends stripped.

Columns are aligned with f-string format specs. Use exactly these headers and widths, so your output
can be compared with the sample:

```python norun
print(f"{'Student':<10} {'Scores':>6} {'Average':>7}  {'Grade':<5}  Best subject")
print(f"{name:<10} {count:>6} {average:>7.1f}  {grade:<5}  {best}")

print(f"{'Subject':<10} {'Scores':>6} {'Average':>7} {'Low':>4} {'High':>4}  Top student")
print(f"{subject:<10} {count:>6} {average:>7.1f} {low:>4} {high:>4}  {top}")
```

## Sample run

Given these lines, followed by a blank line:

```text
Ada, Maths, 91
Grace, Maths, 78
ada, physics, 85
Linus, Maths, abc
Grace, Physics, 88
Ada, History, 72
Grace , maths, 82
Ken, Physics
Ken, History, 64
Ken, Maths, 58
Linus, History, 104
Linus, Physics, 93
, Maths, 70
Linus, Maths, 69
```

the program prints:

```text
Gradebook: 10 scores, 4 students, 3 subjects

STUDENTS
Student    Scores Average  Grade  Best subject
Ada             3    82.7  B      Maths
Grace           3    82.7  B      Physics
Linus           2    81.0  B      Physics
Ken             2    61.0  D      History

SUBJECTS
Subject    Scores Average  Low High  Top student
History         2    68.0   64   72  Ada
Maths           5    75.6   58   91  Ada
Physics         3    88.7   85   93  Linus

SKIPPED (4)
line 4: "Linus, Maths, abc" (score is not a whole number)
line 8: "Ken, Physics" (expected name, subject, score)
line 11: "Linus, History, 104" (score is over 100)
line 13: ", Maths, 70" (name or subject is missing)
```

Things to notice: Ada and Grace tie on 82.7 (both exactly 248 / 3), so Ada comes first by name.
Grace's two maths scores average 80, so her best subject is Physics. Linus's "abc" and "104" lines
are skipped, so he has only two scores.

## How to approach it

Build it in stages, running it after each one:

1. **Read and parse.** Loop over `input()` until a blank line. Split each line on commas and strip
   the fields. Try a `match` on the list of fields: `case [name, subject, score] if name and subject:`
   handles the good shape, and the other cases give you the reasons. Keep valid records as
   `(name, subject, score)` tuples and skipped ones as `(line_number, text, reason)`.
2. **Group.** A nested dict makes both tables easy:
   `by_student.setdefault(name, {}).setdefault(subject, []).append(score)` gives
   `{"Ada": {"Maths": [91], "Physics": [85], ...}, ...}`. Build `by_subject` the same way, the other
   way round.
3. **Compute.** For each student, flatten their scores with a comprehension, then use `sum`, `len`,
   `min` and `max`. A letter grade is a nice fit for `match` with guards (`case a if a >= 90:`), or a
   plain `if`/`elif` chain.
4. **Sort and print.** Tuples compare item by item, so a list of `(-average, name, ...)` tuples sorts
   by average, highest first, then by name: `sorted(rows)` does the rest. The same trick finds a best
   subject: the smallest `(-subject_average, subject)` pair.

> [!TIP]
> Keep a file of test input next to your program and run it with
> `python gradebook.py < scores.txt` (or `uv run gradebook.py < scores.txt`). Make sure the file
> ends with an empty line: `input()` stops at the blank line, and without one it runs out of input
> and raises `EOFError`.

## Stretch goals

Once the required report matches the sample exactly, try any of these:

- **Grade distribution.** After the students table, print a bar per letter grade:
  `B | ### (3)`. `"#" * count` builds the bar.
- **Missing work.** List students who have no score at all in a subject that other students were
  scored in, for example `Grace: no History score`. Sets make this a one-line difference per student.
- **Medians.** Add a median column to the subjects table. Sort the scores; the median is the middle
  one, or the mean of the two middle ones when there's an even number.
- **Decimal scores.** Accept scores like `87.5`, still rejecting anything outside 0 to 100, and show
  them to one decimal place.

## Submitting

Submit `gradebook.py`, plus the input file you tested with, from this capstone's page: upload the
files, or link a GitHub repository that contains them. The reviewer runs your program on the sample
input above and on a second, messier input, then reads your code against the checklist below. Add a
note if you did any of the stretch goals.
