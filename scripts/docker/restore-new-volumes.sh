#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Restores only to two NEW volumes; never cleans or writes an existing volume.
[[ $# == 3 ]] || { printf 'Usage: bash scripts/docker/restore-new-volumes.sh BACKUP_DIR NEW_DB_VOLUME NEW_MEDIA_VOLUME\n' >&2; exit 1; }
backup=$1
database_volume=$2
media_volume=$3
[[ $database_volume =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]+$ && $media_volume =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]+$ && $database_volume != "$media_volume" ]] || { printf 'Use two distinct simple Docker volume names.\n' >&2; exit 1; }
[[ -f "$backup/COMPLETE" && -f "$backup/manifest.txt" && -s "$backup/database.dump" && -s "$backup/media.tar.gz" ]] || { printf 'Backup is incomplete.\n' >&2; exit 1; }
command -v docker >/dev/null
command -v sha256sum >/dev/null
docker info >/dev/null
(cd -- "$backup" && sha256sum -c SHA256SUMS)
read_manifest() {
  awk -F= -v wanted="$1" '$1 == wanted { print substr($0, index($0, "=") + 1); count++ } END { if (count != 1) exit 1 }' "$backup/manifest.txt"
}
[[ $(read_manifest format) == 1 && $(read_manifest postgres_major) == 16 ]] || { printf 'Unsupported backup format or PostgreSQL major.\n' >&2; exit 1; }
database_image=$(read_manifest database_image)
web_image=$(read_manifest web_image)
database_name=$(read_manifest database_name)
database_user=$(read_manifest database_user)
[[ $database_image =~ ^sha256:[a-f0-9]{64}$ && $web_image =~ ^sha256:[a-f0-9]{64}$ ]] || { printf 'Invalid source image IDs.\n' >&2; exit 1; }
[[ $database_name =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ && $database_user =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]] || { printf 'Database identifiers require a manual restore review.\n' >&2; exit 1; }
for image in "$database_image" "$web_image"; do
  docker image inspect "$image" >/dev/null 2>&1 || { printf 'Source image missing. Load the verified images.tar.gz backup first (docker image load --input PATH).\n' >&2; exit 1; }
done
for volume in "$database_volume" "$media_volume"; do
  if docker volume inspect "$volume" >/dev/null 2>&1; then printf 'Refusing to overwrite existing volume: %s\n' "$volume" >&2; exit 1; fi
done
[[ ${RESTORE_POSTGRES_PASSWORD:-} && ${#RESTORE_POSTGRES_PASSWORD} -ge 12 ]] || { printf 'Set RESTORE_POSTGRES_PASSWORD privately (12 characters minimum); it will not be printed.\n' >&2; exit 1; }
temporary_container="a2e-restore-$(date -u +%Y%m%d%H%M%S)-$$"
cleanup() {
  result=$?
  trap - EXIT
  docker rm -f "$temporary_container" >/dev/null 2>&1 || true
  if [[ $result != 0 ]]; then printf 'Restore failed. Source volumes are unchanged; retain the new volumes for investigation.\n' >&2; fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
docker volume create --label a2e.restore=true "$database_volume" >/dev/null
docker volume create --label a2e.restore=true "$media_volume" >/dev/null
POSTGRES_PASSWORD=$RESTORE_POSTGRES_PASSWORD docker run -d --name "$temporary_container" --network none \
  --env POSTGRES_PASSWORD --env "POSTGRES_USER=$database_user" --env "POSTGRES_DB=$database_name" \
  --mount "type=volume,src=$database_volume,dst=/var/lib/postgresql/data" "$database_image" >/dev/null
ready=0
for ((attempt=0; attempt<60; attempt++)); do
  if docker exec "$temporary_container" sh -ec 'pg_isready -q -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[[ $ready == 1 ]] || { printf 'Temporary PostgreSQL did not become ready.\n' >&2; exit 1; }
docker exec -i "$temporary_container" sh -ec 'exec pg_restore --single-transaction --exit-on-error --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$backup/database.dump"
docker run --rm -i --network none --user 0:0 --entrypoint sh \
  --mount "type=volume,src=$media_volume,dst=/target" "$web_image" \
  -ec 'tar -xzf - -C /target --no-same-owner --no-same-permissions && chown -R 1000:1000 /target' < "$backup/media.tar.gz"
docker exec "$temporary_container" sh -ec 'psql -X -At -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM pg_tables WHERE schemaname = '\''public'\''"' >/dev/null
printf 'Restore complete in NEW volumes only.\nA2E_POSTGRES_VOLUME=%s\nA2E_MEDIA_VOLUME=%s\n' "$database_volume" "$media_volume"
printf 'Match POSTGRES_USER/POSTGRES_DB and use the private restore password in Portainer and DATABASE_URL. Validate the site before changing the proxy.\n'
