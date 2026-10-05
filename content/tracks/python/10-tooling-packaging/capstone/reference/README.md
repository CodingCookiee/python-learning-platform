# worklog

Log the hours you work for each client from any terminal, and total them by ISO week when you
invoice. Hours are kept exactly, as decimals, in a JSON Lines file.

## Install

    uv tool install git+https://github.com/ada/worklog@v0.1.0

## Use

    worklog add "Millstone Coffee" 2.5 --date 2026-09-28 --note "Stock report fixes"
    worklog add "Kiln Cafe" 1:15
    worklog list --week 2026-W40
    worklog report --week 2026-W40
    worklog report --week 2026-W40 --format csv > hours.csv

The log lives in `~/.worklog.jsonl`. Use `--file PATH` or the `WORKLOG_FILE` environment variable
to put it somewhere else. `-v` and `-vv` say more on stderr, and `-q` says only errors.

## Development

    uv sync
    pre-commit install
    uv run ruff check
    uv run ruff format --check
    uv run mypy
    uv run pytest
