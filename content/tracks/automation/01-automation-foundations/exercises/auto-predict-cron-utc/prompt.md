The clinic's reminder workflow is scheduled on GitHub Actions with `cron: "0 8 * * *"`, and
GitHub runs every schedule in UTC. The clinic is in London. Work out what time the job really
runs there in January and in July, and which UTC hour would give 08:00 local time. Type exactly
what the program prints.
