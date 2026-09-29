`Refundable` is a protocol marked `@runtime_checkable`, so `isinstance` accepts it. Four payment
types are checked against it, and only one of them really fits the protocol's signature. Work out
what `isinstance` actually checks, and type exactly what the program prints.
