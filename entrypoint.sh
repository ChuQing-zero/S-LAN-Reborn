#!/bin/bash

app_env=${1:-development}

build_target="hello_world"

dev_commands() {
    echo "Running development environment commands..."
    NODE_ENV=development node src/index.js
}

prod_commands() {
    echo "Running production environment commands..."
    NODE_ENV=production node src/index.js
}

if [ "$app_env" = "production" ] || [ "$app_env" = "prod" ] ; then
    echo "Production environment detected"
    prod_commands
else
    echo "Development environment detected"
    dev_commands
fi
