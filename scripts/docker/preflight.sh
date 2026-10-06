#!/usr/bin/env bash
set -Eeuo pipefail

# Read-only inventory of the running NAS deployment. No environment/secret dump.
web=${A2E_WEB_CONTAINER:-a2e-web}
database=${A2E_DB_CONTAINER:-a2e-postgres}
command -v docker >/dev/null || { printf 'Docker CLI is required on the NAS.\n' >&2; exit 1; }
docker info >/dev/null
docker compose version
for container in "$database" "$web"; do
  docker inspect --format 'Container={{.Name}} image={{.Config.Image}} id={{.Image}} running={{.State.Running}}' "$container"
done
database_mount=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Type}}|{{.Name}}{{end}}{{end}}' "$database")
media_mount=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/public/uploads"}}{{.Type}}|{{.Name}}{{end}}{{end}}' "$web")
[[ $database_mount == volume\|* && $media_mount == volume\|* ]] || {
  printf 'Expected named PostgreSQL and media volumes were not found. Review bind mounts manually before any update.\n' >&2
  exit 1
}
printf 'A2E_POSTGRES_VOLUME=%s\nA2E_MEDIA_VOLUME=%s\n' "${database_mount#volume|}" "${media_mount#volume|}"
docker exec "$database" sh -ec 'psql -X -At -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version()"'
docker exec "$database" sh -ec 'psql -X -At -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT tablename FROM pg_tables WHERE schemaname = '\''public'\'' ORDER BY tablename"'
docker inspect --format 'Web health={{if .State.Health}}{{.State.Health.Status}}{{else}}not configured{{end}}' "$web"
printf 'Record the current Portainer stack name, image tag/digest and volume names. Store secrets separately in Portainer.\n'
