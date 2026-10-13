# Custom PostGIS image with pgvector, for the search feature (.scratch/search).
# postgis/postgis:16-3.4-alpine ships PostGIS but not pgvector, and Alpine has no
# prebuilt pgvector apk — so we compile it from source against PostgreSQL 16.
FROM postgis/postgis:16-3.4-alpine

ARG PGVECTOR_VERSION=v0.7.4

RUN apk add --no-cache --virtual .pgvector-build git build-base postgresql16-dev clang15 llvm15 \
    && git clone --depth 1 --branch ${PGVECTOR_VERSION} https://github.com/pgvector/pgvector.git /tmp/pgvector \
    && make -C /tmp/pgvector \
    && make -C /tmp/pgvector install \
    && rm -rf /tmp/pgvector \
    && apk del .pgvector-build
