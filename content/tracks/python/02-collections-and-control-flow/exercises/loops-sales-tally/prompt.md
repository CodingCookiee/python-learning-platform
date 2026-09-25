Write a program that reads the number of units sold each day, one line at a time, and then prints a
summary.

- Keep reading until a line is blank or says `done` (in any case, so `Done` and `DONE` count too).
- Ignore spaces around a number: ` 7 ` is 7.
- A line that isn't a whole number is skipped with a message, and doesn't count as a day:
  `Skipping "twelve": not a whole number`.
- Then print the number of days, the total, and the best day. Days are numbered from 1 in the order
  they were entered, and if two days tie for best, report the earlier one.
- If no valid days were entered, print `No sales recorded` instead.

With the input lines `12`, `23`, `twelve`, `9`, `13` and a blank line, the program prints:

```text
Skipping "twelve": not a whole number
Days: 4
Total: 57
Best day: day 2 (23 units)
```

You can show a prompt with `input("Units sold: ")`; the tests ignore prompt text.
