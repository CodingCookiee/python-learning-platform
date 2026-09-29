import argparse


def build_parser():
    """The parser for: backup SOURCE [--dest DEST] [--dry-run] [-k KEEP]"""
    parser = argparse.ArgumentParser(prog="backup", description="Back up a folder.")
    ...
    return parser
