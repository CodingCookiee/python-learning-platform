"""Gradebook report.

Reads "name, subject, score" lines until a blank line, then prints per-student and
per-subject statistics and a list of the lines it had to skip.
Run it with:  python gradebook.py < scores.txt
"""


def parse_line(line):
    """Return (name, subject, score) for a valid line, or the reason (a str) it's invalid."""
    fields = [field.strip() for field in line.split(",")]
    match fields:
        case [name, subject, score] if not name or not subject:
            return "name or subject is missing"
        case [name, subject, score]:
            if not score.isdecimal():
                return "score is not a whole number"
            value = int(score)
            if value > 100:
                return "score is over 100"
            return name.title(), subject.title(), value
        case _:
            return "expected name, subject, score"


def letter_grade(average):
    """Return "A", "B", "C", "D" or "F" for an average score."""
    match average:
        case a if a >= 90:
            return "A"
        case a if a >= 80:
            return "B"
        case a if a >= 70:
            return "C"
        case a if a >= 60:
            return "D"
        case _:
            return "F"


def mean(values):
    """The arithmetic mean of a non-empty list."""
    return sum(values) / len(values)


def main():
    records = []
    skipped = []
    line_number = 0
    while (line := input()).strip():
        line_number += 1
        result = parse_line(line)
        if isinstance(result, str):
            skipped.append((line_number, line.strip(), result))
        else:
            records.append(result)

    by_student = {}
    by_subject = {}
    for name, subject, score in records:
        by_student.setdefault(name, {}).setdefault(subject, []).append(score)
        by_subject.setdefault(subject, {}).setdefault(name, []).append(score)

    print(f"Gradebook: {len(records)} scores, {len(by_student)} students, {len(by_subject)} subjects")

    if by_student:
        rows = []
        for name, subjects in by_student.items():
            scores = [score for marks in subjects.values() for score in marks]
            best = min((-mean(marks), subject) for subject, marks in subjects.items())[1]
            rows.append((-mean(scores), name, len(scores), best))
        print()
        print("STUDENTS")
        print(f"{'Student':<10} {'Scores':>6} {'Average':>7}  {'Grade':<5}  Best subject")
        for negative, name, count, best in sorted(rows):
            average = -negative
            print(f"{name:<10} {count:>6} {average:>7.1f}  {letter_grade(average):<5}  {best}")

        print()
        print("SUBJECTS")
        print(f"{'Subject':<10} {'Scores':>6} {'Average':>7} {'Low':>4} {'High':>4}  Top student")
        for subject in sorted(by_subject):
            students = by_subject[subject]
            scores = [score for marks in students.values() for score in marks]
            top = min((-mean(marks), name) for name, marks in students.items())[1]
            average = mean(scores)
            print(f"{subject:<10} {len(scores):>6} {average:>7.1f} {min(scores):>4} {max(scores):>4}  {top}")

    if skipped:
        print()
        print(f"SKIPPED ({len(skipped)})")
        for number, text, reason in skipped:
            print(f'line {number}: "{text}" ({reason})')


if __name__ == "__main__":
    main()
