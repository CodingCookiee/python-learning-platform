from itertools import groupby

statuses = [200, 200, 404, 200, 500, 500]
for code, run in groupby(statuses):
    print(code, len(list(run)))

print([code for code, _ in groupby(sorted(statuses))])
print(len(list(groupby("aaabbbaaa"))))
