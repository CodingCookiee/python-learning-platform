import logging.config
import tomllib

from invoicer import billing  # imported before logging is configured, like in most apps


def configure(path="logging.toml", verbose=False):
    """Apply the dictConfig settings in the TOML file at path.
    verbose=True also shows DEBUG messages on the console."""
    with open(path, "rb") as fh:
        config = tomllib.load(fh)
    if verbose:
        config["handlers"]["console"]["level"] = "DEBUG"
    logging.config.dictConfig(config)


def main():
    configure()
    billing.charge("INV-1042", 1950)


if __name__ == "__main__":
    main()
