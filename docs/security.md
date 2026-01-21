# Security

- Commands are executed via argv arrays only.
- Docker command is restricted to `docker` or `podman`.
- Compose paths and scaffold targets are validated to stay under repo root.
- Compose bind mounts are validated to remain under repo root.
- Scaffold names are sanitized using configured patterns.
- Command output redacts common secrets and sensitive environment values.
