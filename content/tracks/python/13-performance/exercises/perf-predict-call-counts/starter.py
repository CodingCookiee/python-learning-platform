import cProfile
import pstats


def is_valid(line):
    return line.count(",") == 2


def parse(line):
    sku, quantity, price = line.split(",")
    return sku, int(quantity), float(price)


def load(lines):
    rows = []
    for line in lines:
        if is_valid(line):
            rows.append(parse(line))
    return rows


def category_size(category):
    size = 1
    for child in category["children"]:
        size += category_size(child)
    return size


LINES = ["MUG-01,2,8.50", "bad line", "LAMP-02,1,24.00", "MUG-01,1,8.50", "PEN,5"]
CATALOGUE = {"children": [{"children": []}, {"children": [{"children": []}, {"children": []}]}]}

with cProfile.Profile() as profiler:
    load(LINES)
    load(LINES[:2])
    category_size(CATALOGUE)

calls = pstats.Stats(profiler).get_stats_profile().func_profiles
for name in ["load", "is_valid", "parse", "category_size"]:
    print(name, calls[name].ncalls)
