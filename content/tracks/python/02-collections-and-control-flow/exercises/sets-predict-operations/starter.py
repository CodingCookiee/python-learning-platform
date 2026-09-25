leeds = {"MUG", "TEE", "CAP", "MUG"}
york = {"TEE", "SCARF", "CAP", "HAT"}

print(len(leeds))
print(sorted(leeds & york))
print(sorted(leeds - york))
print(sorted(york ^ leeds))
print({"CAP", "TEE"} <= york)

york.discard("MUG")
york.add("TEE")
print(len(york))
