"""Lightweight metrics HTTP server for the bot.

Exposes Prometheus-compatible metrics at /metrics using a tiny FastAPI app.
Only started if BOT_ENABLE_METRICS=1 to avoid overhead when unused.
"""
from __future__ import annotations

import os
import time
import threading
from typing import Optional

from fastapi import FastAPI, Response

try:  # optional dependency pattern (fastapi is already in requirements)
    from prometheus_client import CollectorRegistry, CONTENT_TYPE_LATEST, generate_latest, Counter, Gauge
except Exception:  # pragma: no cover - if missing, metrics just disabled
    CollectorRegistry = None  # type: ignore

_app: Optional[FastAPI] = None
_thread: Optional[threading.Thread] = None
_registry = None
_bot_latency = None
_startup_time = time.time()


def get_app() -> Optional[FastAPI]:
    global _app, _registry, _bot_latency
    if _app is not None:
        return _app
    if CollectorRegistry is None:
        return None
    _registry = CollectorRegistry()  # fresh isolated registry
    _bot_latency = Gauge('bot_ws_latency_seconds', 'Last measured Discord websocket latency (seconds)', registry=_registry)
    Gauge('bot_uptime_seconds', 'Bot process uptime in seconds', registry=_registry)
    Counter('bot_events_total', 'Total Discord gateway events observed', registry=_registry)
    _app = FastAPI()

    @_app.get('/health')
    async def health():  # noqa: D401
        return {'ok': True, 'uptime': int(time.time() - _startup_time)}

    @_app.get('/metrics')
    async def metrics():  # noqa: D401
        if _registry is None:
            return Response(status_code=503, content='registry not initialized')
        return Response(generate_latest(_registry), media_type=CONTENT_TYPE_LATEST)

    return _app


def start_metrics_server(host: str = '0.0.0.0', port: int = 9310):  # typical non-conflicting port
    """Start the metrics server in a background thread if enabled and not already running."""
    global _thread
    if os.getenv('BOT_ENABLE_METRICS', '1') != '1':  # opt-out flag
        return
    if _thread and _thread.is_alive():
        return
    app = get_app()
    if app is None:
        return
    import uvicorn  # imported late to reduce import cost if unused

    def _run():
        uvicorn.run(app, host=host, port=port, log_level='warning')

    _thread = threading.Thread(target=_run, name='metrics-server', daemon=True)
    _thread.start()


def observe_ws_latency(seconds: float):  # integration point from bot heartbeat events
    if _bot_latency is not None:
        try:
            _bot_latency.set(seconds)
        except Exception:  # pragma: no cover
            pass
