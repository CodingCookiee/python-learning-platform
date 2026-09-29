text = "Refunds reach your card in 5 to 10 working days."
size, overlap = 16, 5
step = size - overlap

starts = list(range(0, len(text), step))
print("length:", len(text), "step:", step)
print("starts:", starts)

for start in starts:
    window = text[start:start + size]
    print(start, repr(window))
    if start + size >= len(text):
        break
