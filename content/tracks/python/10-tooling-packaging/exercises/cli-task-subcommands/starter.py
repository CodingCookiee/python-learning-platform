import argparse
import sys
from datetime import date


def build_parser():
    parser = argparse.ArgumentParser(prog="tasks", description="A tiny to-do list.")
    # add, list and done subcommands
    return parser


def main(argv, tasks):
    """Run one command against tasks (a list of task dicts, changed in place). Return the exit code."""
    ...
