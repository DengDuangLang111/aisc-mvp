#!/bin/bash
cd "$(dirname "$0")"
exec node -r dotenv/config dist/apps/api/src/main
