#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Consistent DB + uploads snapshot: briefly stop the sole application writer.
# BACKUP_KEEP_WEB_STOPPED=1 leaves the site in maintenance for immediate upgrade.
web=${A2E_WEB_CONTAINER:-a2e-web}
database=${A2E_DB_CONTAINER:-a2e-postgres}
backup_root=${A2E_BACKUP_ROOT:-/volume2/docker/a2e/backups}
[[ $backup_root == /* && $backup_root != / ]] || { printf 'A2E_BACKUP_ROOT must be an absolute dedicated directory.\n' >&2; exit 1; }
for executable in docker sha256sum gzip; do command -v "$executable" >/dev/null || { printf '%s is required.\n' "$executable" >&2; exit 1; }; done
docker info >/dev/null
[[ $(docker inspect --format '{{.State.Running}}' "$database") == true ]] || { printf 'PostgreSQL must already be running.\n' >&2; exit 1; }
db_mount=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Type}}|{{.Name}}{{end}}{{end}}' "$database")
media_mount=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/public/uploads"}}{{.Type}}|{{.Name}}{{end}}{{end}}' "$web")
[[ $db_mount == volume\|* && $media_mount == volume\|* ]] || { printf 'Expected named volumes missing; backup aborted before stopping the site.\n' >&2; exit 1; }
web_image=$(docker inspect --format '{{.Image}}' "$web")
db_image=$(docker inspect --format '{{.Image}}' "$database")
web_reference=$(docker inspect --format '{{.Config.Image}}' "$web")
db_reference=$(docker inspect --format '{{.Config.Image}}' "$database")
db_name=$(docker exec "$database" sh -ec 'printf "%s" "$POSTGRES_DB"')
db_user=$(docker exec "$database" sh -ec 'printf "%s" "$POSTGRES_USER"')
major=$(docker exec "$database" sh -ec 'psql -X -At -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SHOW server_version_num"')
[[ $major == 16[0-9][0-9][0-9][0-9] ]] || { printf 'This migration package expects PostgreSQL 16. Review a different major version manually.\n' >&2; exit 1; }
mkdir -p -- "$backup_root"
backup="$backup_root/$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -- "$backup"
restart_web=0
cleanup() {
  result=$?
  trap - EXIT
  if [[ $restart_web == 1 ]]; then
    if ! docker start "$web" >/dev/null; then
      printf 'Backup ended; the web container could not restart. Start it manually in Portainer.\n' >&2
      result=1
    fi
  fi
  if [[ $result != 0 ]]; then printf 'Backup incomplete: %s (no COMPLETE marker; do not restore it).\n' "$backup" >&2; fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
if [[ $(docker inspect --format '{{.State.Running}}' "$web") == true ]]; then
  restart_web=1
  docker stop --time 30 "$web" >/dev/null
fi
docker exec "$database" sh -ec 'exec pg_dump --format=custom --no-owner --no-acl -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$backup/database.dump"
[[ -s "$backup/database.dump" ]]
docker exec -i "$database" pg_restore --list < "$backup/database.dump" > /dev/null
docker run --rm --network none --user 0:0 --entrypoint tar \
  --mount "type=volume,src=${media_mount#volume|},dst=/source,readonly" \
  "$web_image" -C /source -czf - . > "$backup/media.tar.gz"
docker run --rm -i --network none --entrypoint tar "$web_image" -tzf - < "$backup/media.tar.gz" > /dev/null
{
  printf 'format=1\ncreated_utc=%s\n' "$(date -u +%FT%TZ)"
  printf 'web_image=%s\nweb_reference=%s\ndatabase_image=%s\ndatabase_reference=%s\n' "$web_image" "$web_reference" "$db_image" "$db_reference"
  printf 'database_volume=%s\nmedia_volume=%s\ndatabase_name=%s\ndatabase_user=%s\npostgres_major=16\n' "${db_mount#volume|}" "${media_mount#volume|}" "$db_name" "$db_user"
} > "$backup/manifest.txt"
if [[ ${BACKUP_INCLUDE_IMAGES:-0} == 1 ]]; then
  docker image save "$web_image" "$db_image" | gzip > "$backup/images.tar.gz"
  gzip -t "$backup/images.tar.gz"
fi
(
  cd -- "$backup"
  sha256sum database.dump media.tar.gz manifest.txt > SHA256SUMS
  if [[ -f images.tar.gz ]]; then sha256sum images.tar.gz >> SHA256SUMS; fi
  sha256sum -c SHA256SUMS >/dev/null
)
printf 'complete\n' > "$backup/COMPLETE"
if [[ ${BACKUP_KEEP_WEB_STOPPED:-0} == 1 ]]; then restart_web=0; fi
printf 'Backup complete: %s\n' "$backup"
printf 'Database, media and checksums verified. Copy this private directory off the NAS before migration.\n'
