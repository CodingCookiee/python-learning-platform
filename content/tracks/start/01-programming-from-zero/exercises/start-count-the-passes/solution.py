marks = [72, 45, 90, 38, 66]

passed = 0
for mark in marks:
    if mark >= 50:
        print(mark, "pass")
        passed += 1
    else:
        print(mark, "fail")

print(f"{passed} of {len(marks)} passed")
