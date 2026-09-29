Three tests share a module-scoped `gateway` fixture and a function-scoped `order` fixture, both
written with `yield`. The program runs them with printing switched on and pytest's own report
switched off. A small plugin prints each test's result as soon as the test body has finished.

Type exactly what the program prints.
