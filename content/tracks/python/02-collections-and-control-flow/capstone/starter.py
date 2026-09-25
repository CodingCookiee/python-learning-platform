"""Gradebook report.

Reads "name, subject, score" lines until a blank line, then prints per-student and
per-subject statistics and a list of the lines it had to skip.
Run it with:  python gradebook.py < scores.txt
"""


def parse_line(line):
    """Return (name, subject, score) for a valid line, or the reason (a str) it's invalid.

    Names and subjects are stripped and title-cased; score is an int from 0 to 100.
    """
    ...


def letter_grade(average):
    """Return "A", "B", "C", "D" or "F" for an average score."""
    ...


records = []   # (name, subject, score) tuples
skipped = []   # (line_number, text, reason) tuples

# 1. Read lines with input() until a blank line, sorting each into records or skipped.

# 2. Group the scores: {student: {subject: [scores]}} and {subject: {student: [scores]}}.

# 3. Print the summary line and the STUDENTS table.

# 4. Print the SUBJECTS table.

# 5. Print the SKIPPED section, if any lines were skipped.
