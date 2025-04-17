# E2E tests for ILC

Please see related section in [contribution guide](../CONTRIBUTING.md).

## Running E2E tests in Docker container

To run E2E tests in a Docker container locally:

1. Build ILC and Registry: `npm run build`
2. Build the E2E test container:
    ```
    cd e2e
    docker build -t ilc-e2e-tests .
    ```
3. Run the E2E tests container:
    ```
    docker run --rm --add-host=host.docker.internal:host-gateway \
      -e DB_CLIENT=mysql \
      -e DB_HOST=localhost \
      -e DB_PORT=3306 \
      -e DB_USER=root \
      -e DB_PASSWORD=pwd \
      -e DB_NAME=ilc \
      -e ILC_HOST=host.docker.internal \
      ilc-e2e-tests
    ```

Note: The `--add-host=host.docker.internal:host-gateway` flag is crucial for the container to properly resolve the host machine's address. Without this flag, the container will not be able to connect to services running on the host.
