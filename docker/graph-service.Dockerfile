FROM python:3.12-slim AS builder
WORKDIR /app

# Build dependencies (tree-sitter language libs need a C toolchain)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY graph-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app

# Carry installed packages from the builder layer
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy app code
COPY graph-service/ .

EXPOSE 5000
# Single worker — main.py keeps an in-memory ``_graph_cache`` per process.
# Scaling out should use multiple replicas (each with its own cache) rather
# than multiple workers within one container.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "1"]
