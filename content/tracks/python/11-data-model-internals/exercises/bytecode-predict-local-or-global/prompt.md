Three pricing functions read a module-level `discount`, and each one's code object records which
names it treats as locals (`co_varnames`) and which as globals (`co_names`). That decision is made
when the function is compiled, before any of them runs. Type exactly what the program prints.
