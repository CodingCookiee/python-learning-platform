class PageCounter:
    def __init__(self, path):
        self.path = path
        self.views = 0

    def hit(self):
        self.views += 1
        return self.views


home = PageCounter("/")
about = PageCounter("/about")

home.hit()
home.hit()
PageCounter.hit(about)

record = home.hit
record()

print(home.views, about.views)
print(PageCounter.hit(about))
print(record(), home.path)
