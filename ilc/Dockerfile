# syntax=docker/dockerfile:1.7-labs
# Built from the repository root: docker build --file ./ilc/Dockerfile .

FROM node:22-alpine

RUN apk update && apk add --no-cache bash git openssh python3 make g++ findutils

# Only the manifests are copied, so the dependencies layer is rebuilt only when they change
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ilc/package.json ./ilc/
# corepack installs the pnpm version from packageManager (pnpm -v prints it here) as the default for the whole image,
# because pnpm deploy does not keep packageManager. It is kept outside the home directory so any user can run it.
ENV COREPACK_HOME=/usr/local/share/corepack COREPACK_DEFAULT_TO_LATEST=0
RUN corepack enable pnpm && corepack install --global pnpm@"$(pnpm -v)"
# pnpm runs an install before every `pnpm <script>` when it thinks node_modules does not match the lockfile.
# Dependencies of the image do not change after the install below, so the check can only misfire: in images built
# on top of this one that add packages, it reinstalls without their settings and fails the minimumReleaseAge check,
# writes the pnpm metadata cache (hundreds of MB) into their layer and needs the network when containers start.
ENV pnpm_config_verify_deps_before_run=false
# pnpm deploy makes /codebase a standalone project with only the ILC dependencies and its own lockfile.
# pnpm deploy writes its lockfile and pnpm-workspace.yaml readable by root only, pnpm fails for other users without them.
# The store stays, images built on top of this one reuse it. The metadata cache (about 500 MB)
# is only needed during installs, it is kept in a build cache mount and never gets into the image.
RUN --mount=type=cache,id=pnpm-metadata,target=/root/.cache/pnpm \
    pnpm --filter ilc deploy /codebase && \
    chmod a+r /codebase/pnpm-lock.yaml /codebase/pnpm-workspace.yaml && \
    rm -rf /workspace

WORKDIR /codebase
# Integrity check. Package @newrelic/native-metrics is a native addon that has to be built on alpine
RUN node -e "require('@newrelic/native-metrics')"

# package.json stays as written by pnpm deploy, it matches the lockfile pnpm deploy created
COPY --exclude=package.json ./ilc/ /codebase/

ENV LEGACY_PLUGINS_DISCOVERY=true

RUN pnpm build

ENV NODE_ENV=production

CMD ["pnpm", "start"]
