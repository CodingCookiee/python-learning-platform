"""Acceptance tests for the gradebook report, run by GitHub Actions in your repository.

They run `python gradebook.py` from the top of your repository, type the lines for you
(followed by a blank line), and check the report it prints against the brief.
"""

import subprocess
import sys
from pathlib import Path

PROGRAM = Path("gradebook.py")

SAMPLE = [
    "Ada, Maths, 91",
    "Grace, Maths, 78",
    "ada, physics, 85",
    "Linus, Maths, abc",
    "Grace, Physics, 88",
    "Ada, History, 72",
    "Grace , maths, 82",
    "Ken, Physics",
    "Ken, History, 64",
    "Ken, Maths, 58",
    "Linus, History, 104",
    "Linus, Physics, 93",
    ", Maths, 70",
    "Linus, Maths, 69",
]

SAMPLE_REPORT = """\
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
line 13: ", Maths, 70" (name or subject is missing)"""


def run(*lines: str) -> subprocess.CompletedProcess[str]:
    """Run the program, typing each line, then a blank line to finish."""
    assert PROGRAM.exists(), "gradebook.py should be at the top of your repository"
    return subprocess.run(
        [sys.executable, str(PROGRAM)],
        input="\n".join([*lines, ""]) + "\n",
        capture_output=True,
        text=True,
        timeout=20,
    )


def report(*lines: str) -> list[str]:
    """The report's lines, from the "Gradebook:" summary on, with trailing spaces removed."""
    result = run(*lines)
    assert result.returncode == 0, f"The program crashed:\n{result.stderr[-1500:]}"
    start = result.stdout.find("Gradebook:")
    assert start != -1, f"No summary line starting with 'Gradebook:' in the output:\n{result.stdout}"
    text = result.stdout[start:].rstrip()
    return [line.rstrip() for line in text.splitlines()]


def section(lines: list[str], title: str) -> list[str]:
    """The rows of one section (after its title and header), up to the next blank line."""
    assert title in lines, f"No {title} section in the report:\n" + "\n".join(lines)
    start = lines.index(title) + 1
    end = lines.index("", start) if "" in lines[start:] else len(lines)
    rows = lines[start:end]
    if title.startswith("SKIPPED"):
        return rows
    return rows[1:]


def test_sample_input_prints_the_report_from_the_brief():
    assert report(*SAMPLE) == SAMPLE_REPORT.splitlines()


def test_summary_counts_only_valid_lines():
    lines = report("Ada, Maths, 91", "Ada, Maths, abc", "Grace, Art, 70", "Ada, Art, 60")
    assert lines[0] == "Gradebook: 3 scores, 2 students, 2 subjects", (
        f"The summary should count valid lines only, got: {lines[0]!r}"
    )


def test_names_and_subjects_ignore_case_and_spaces_and_show_in_title_case():
    lines = report("ADA, MATHS, 90", "  ada  ,  maths  , 80", "Ada, art, 70", "grace, ART, 60")
    assert lines[0] == "Gradebook: 4 scores, 2 students, 2 subjects", (
        "ADA, ada and Ada (and MATHS and maths) should be the same student and subject"
    )
    assert section(lines, "STUDENTS") == [
        "Ada             3    80.0  B      Maths",
        "Grace           1    60.0  D      Art",
    ]
    assert section(lines, "SUBJECTS") == [
        "Art             2    65.0   60   70  Ada",
        "Maths           2    85.0   80   90  Ada",
    ]


def test_retakes_in_the_same_subject_all_count():
    lines = report("Ada, Maths, 50", "Ada, Maths, 70", "Ada, Maths, 90", "Ada, Art, 100")
    assert section(lines, "STUDENTS") == ["Ada             4    77.5  C      Art"], (
        "Every score counts, including several in the same subject"
    )
    assert "Maths           3    70.0   50   90  Ada" in section(lines, "SUBJECTS")


def test_letter_grades_at_each_boundary():
    lines = report(
        "Amy, Maths, 90", "Ben, Maths, 89", "Cal, Maths, 80", "Dee, Maths, 79",
        "Eve, Maths, 70", "Fay, Maths, 60", "Gus, Maths, 59", "Hal, Maths, 0",
    )
    grades = {row.split()[0]: row.split()[3] for row in section(lines, "STUDENTS")}
    expected = {"Amy": "A", "Ben": "B", "Cal": "B", "Dee": "C", "Eve": "C", "Fay": "D", "Gus": "F", "Hal": "F"}
    assert grades == expected, "A is 90 and above, B 80, C 70, D 60, and F below 60"


def test_letter_grade_uses_the_unrounded_average():
    # 19 scores of 90 and one of 89 average 89.95: shown as 90.0, but still a B
    lines = report(*["Ada, Maths, 90"] * 19, "Ada, Maths, 89")
    assert section(lines, "STUDENTS") == ["Ada            20    90.0  B      Maths"], (
        "An average of 89.95 is shown as 90.0 but is still a B: grade the unrounded average"
    )


def test_students_sort_by_average_then_name_and_subjects_alphabetically():
    lines = report(
        "Zed, Physics, 70", "Bea, History, 80", "Amy, Maths, 70", "Cat, Art, 95", "Bea, Maths, 60",
    )
    students = [row.split()[0] for row in section(lines, "STUDENTS")]
    assert students == ["Cat", "Amy", "Bea", "Zed"], (
        f"Students should be sorted by average, highest first, ties by name; got {students}"
    )
    subjects = [row.split()[0] for row in section(lines, "SUBJECTS")]
    assert subjects == ["Art", "History", "Maths", "Physics"], f"Subjects should be alphabetical; got {subjects}"


def test_ties_for_best_subject_and_top_student_go_to_the_first_name_alphabetically():
    lines = report("Zoe, Maths, 80", "Zoe, Art, 80", "Bob, Maths, 80", "Bob, Art, 60", "Abe, Art, 80")
    students = {row.split()[0]: row.split()[-1] for row in section(lines, "STUDENTS")}
    assert students["Zoe"] == "Art", "Zoe's Art and Maths averages tie, so her best subject is Art"
    subjects = {row.split()[0]: row.split()[-1] for row in section(lines, "SUBJECTS")}
    assert subjects == {"Art": "Abe", "Maths": "Bob"}, (
        f"Top students should break ties alphabetically (Abe over Zoe in Art, Bob over Zoe in Maths); got {subjects}"
    )


def test_each_problem_is_reported_with_the_right_reason():
    lines = report(
        "Ada, Maths",
        "Ada, Maths, 90, extra",
        " , Maths, 70",
        "Ada, , abc",
        "Ada, Maths, abc",
        "Ada, Maths, -5",
        "Ada, Maths, 87.5",
        "Ada, Maths, ",
        "Ada, Maths, 101",
        "Ada, Maths, 100",
    )
    assert section(lines, "SKIPPED (9)") == [
        'line 1: "Ada, Maths" (expected name, subject, score)',
        'line 2: "Ada, Maths, 90, extra" (expected name, subject, score)',
        'line 3: ", Maths, 70" (name or subject is missing)',
        'line 4: "Ada, , abc" (name or subject is missing)',
        'line 5: "Ada, Maths, abc" (score is not a whole number)',
        'line 6: "Ada, Maths, -5" (score is not a whole number)',
        'line 7: "Ada, Maths, 87.5" (score is not a whole number)',
        'line 8: "Ada, Maths," (score is not a whole number)',
        'line 9: "Ada, Maths, 101" (score is over 100)',
    ]


def test_no_skipped_section_when_every_line_is_valid():
    lines = report("Ada, Maths, 100", "Grace, Maths, 0")
    assert not any(line.startswith("SKIPPED") for line in lines), (
        "Only print the SKIPPED section when some lines were skipped"
    )
    assert section(lines, "SUBJECTS") == ["Maths           2    50.0    0  100  Ada"]


def test_no_input_line_crashes_it():
    garbage = [",,", ",,,", "   ,   ,   ", "a,b,1e2", "a, b, 0x10", "a, b, 9999999999999999999999", "x, y, ", ","]
    lines = report(*garbage)
    assert lines[0] == "Gradebook: 0 scores, 0 students, 0 subjects"
    assert f"SKIPPED ({len(garbage)})" in lines, "Every bad line should appear in the SKIPPED list"
