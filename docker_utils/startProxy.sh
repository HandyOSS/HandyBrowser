#!/bin/sh
cp /usr/hsdProxy/resolv.conf /etc/resolv.conf && sleep 3 && node /usr/hsdProxy/runProxy.js &

set -e

if [ "${1#-}" != "${1}" ] || [ -z "$(command -v "${1}")" ]; then
  set -- node "$@"
fi

exec "$@"
