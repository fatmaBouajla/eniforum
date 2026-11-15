#!/bin/sh
set -e
# Le volume des CV peut appartenir à root : on rétablit les droits puis on quitte root.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/uploads/cv /app/logs
  chown -R app:app /app/uploads /app/logs
  exec setpriv --reuid=app --regid=app --init-groups java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher "$@"
fi
exec java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher "$@"
