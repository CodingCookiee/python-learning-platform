The blog needs URL slugs for its articles. Here's the ticket:

> `slugify(title, max_length=40)` returns the slug for an article title:
>
> 1. Lower-case, with each run of characters that aren't `a`–`z` or `0`–`9` turned into **one**
>    hyphen: `"Hello, World!"` → `"hello-world"`.
> 2. No hyphens at the start or the end: `"  ...Python 3.13?  "` → `"python-3-13"`.
> 3. A slug longer than `max_length` keeps **as many whole words as fit**:
>    `slugify("ten tips for writing tests", max_length=15)` → `"ten-tips-for"`. A single word longer
>    than the limit is simply cut at `max_length`.
> 4. A title with nothing usable in it gives `"untitled"`.

Build it test-first, in two files. In `test_slug.py` (this tab), write a failing test for the next
rule, and run it to watch it fail. Then make it pass in `slug.py`, and tidy up while everything is
green. Repeat for each rule. The starter's first test already passes.

The checks run your tests against your `slug.py` (they must all pass), check your `slugify` against
the ticket, and run your tests against copies of a correct `slugify` with one bug planted in each.
Your tests have to catch those bugs.
