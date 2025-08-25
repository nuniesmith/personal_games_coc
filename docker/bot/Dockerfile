ARG PYTHON_VERSION=3.11

FROM python:${PYTHON_VERSION}-slim-bookworm AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=on \
        PIP_NO_CACHE_DIR=on \
        PYTHONDONTWRITEBYTECODE=1 \
        PYTHONUNBUFFERED=1

# Build & runtime libs (dev headers only needed in builder)
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        build-essential \
        git \
        curl \
        imagemagick \
        libjpeg-dev \
        zlib1g-dev \
        libpng-dev \
        libfreetype6-dev \
        libsnappy-dev \
        fonts-dejavu \
        locales \
    && sed -i 's/^# *en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen \
    && locale-gen \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/venv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY src/bot/requirements.txt ./requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy source last for better caching
COPY src/bot/. .

#############################
FROM python:${PYTHON_VERSION}-slim-bookworm AS runtime

ENV PIP_DISABLE_PIP_VERSION_CHECK=on \
        PYTHONUNBUFFERED=1 \
        TZ=America/Toronto \
        LANG=en_US.UTF-8 \
        LC_ALL=en_US.UTF-8

# Runtime-only libs (no headers) + imagemagick (for Wand)
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        imagemagick \
        libjpeg-turbo-progs \
        libjpeg62-turbo \
        zlib1g \
        libpng16-16 \
        libfreetype6 \
        libsnappy1v5 \
        fonts-dejavu \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy virtual env + source from builder
COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app /app
ENV PATH="/opt/venv/bin:$PATH"

# Create healthcheck script (needs root for /usr/local/bin) before dropping privileges
RUN printf '#!/usr/bin/env bash\nset -e\nif curl -fsS http://127.0.0.1:8027/health >/dev/null 2>&1; then exit 0; fi\npython - <<"EOF"\nimport os,sys\nif os.getenv("DISCORD_BOT_TOKEN") or os.getenv("DISCORD_BOT_TOKEN"):\n    sys.exit(0)\nprint({"status":"starting","reason":"DISCORD_BOT_TOKEN/DISCORD_BOT_TOKEN missing & health endpoint down"})\nsys.exit(1)\nEOF\n' > /usr/local/bin/container-health \
        && chmod +x /usr/local/bin/container-health

# Legacy env var shim + start (root writes file, runtime executes as botuser)
RUN printf '#!/usr/bin/env bash\nset -euo pipefail\n: "${DISCORD_BOT_TOKEN:=}"\nif [ -z "$DISCORD_BOT_TOKEN" ] && [ -n "${DISCORD_BOT_TOKEN:-}" ]; then\n  export DISCORD_BOT_TOKEN="$DISCORD_BOT_TOKEN"\nfi\nexec python main.py\n' > /usr/local/bin/entrypoint.sh \
        && chmod +x /usr/local/bin/entrypoint.sh

# Create non-root user and switch
RUN useradd -m -u 1001 botuser
USER botuser

EXPOSE 8027

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 CMD /usr/local/bin/container-health

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
