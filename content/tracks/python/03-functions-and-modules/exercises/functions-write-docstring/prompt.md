`late_fee` works, but the only documentation is a comment above it, which `help()` and editors
never see. Replace the comment with a docstring that follows the conventions from the lesson:

- The first line is a one-sentence summary, at most 72 characters, ending with a full stop and
  written as a command ("Return…", not "This function…").
- Then a blank line.
- Then a description that names both parameters, `amount_due` and `days_late`, and mentions the
  25% cap.

For example, `print(late_fee.__doc__)` could show:

```text
Return the late fee for an unpaid invoice, rounded to cents.

amount_due is the unpaid amount; days_late is how many days overdue it is.
The fee is 2% of amount_due per day late, capped at 25% of amount_due.
```

Use your own words if you like. Don't change what the function does.
