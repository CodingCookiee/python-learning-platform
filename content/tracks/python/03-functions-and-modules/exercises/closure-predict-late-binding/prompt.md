A logger builds one formatting function per level in a loop, twice: once with the late-binding trap
and once with the fix. Work out which `level` each lambda sees at the moment it's **called**, then
type exactly what the program prints.
