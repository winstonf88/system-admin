"""Interactive shell with DB session factory and models preloaded (Django shell_plus–style).

From `backend/` with dev extras (IPython + top-level await):

    uv sync --extra dev
    uv run python -m app.scripts.shell

Or:

    uv run api-shell

Without IPython, falls back to the stdlib asyncio REPL (still supports top-level await).
"""

from __future__ import annotations

import asyncio
import atexit
import sys
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


def _to_sync_database_url(url: str) -> str:
    """Map async SQLAlchemy URLs to sync drivers for an interactive shell session."""
    if url.startswith("postgresql+asyncpg://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql+asyncpg://")
    if url.startswith("sqlite+aiosqlite://"):
        return "sqlite://" + url.removeprefix("sqlite+aiosqlite://")
    return url


def _create_shell_sync_session() -> tuple[Engine, Session]:
    """Open a sync engine + session so selects work without async/await in the REPL."""
    from app.core.config import get_settings

    settings = get_settings()
    sync_url = _to_sync_database_url(settings.database_url)
    engine_kwargs: dict[str, int | bool] = {"pool_pre_ping": True}
    if not sync_url.startswith("sqlite"):
        engine_kwargs.update(
            {
                "pool_size": settings.db_pool_size,
                "max_overflow": settings.db_max_overflow,
                "pool_timeout": settings.db_pool_timeout,
                "pool_recycle": settings.db_pool_recycle,
            }
        )
    sync_engine = create_engine(sync_url, **engine_kwargs)
    SyncSessionLocal = sessionmaker(bind=sync_engine, autoflush=False, expire_on_commit=False)
    return sync_engine, SyncSessionLocal()


def _build_namespace() -> dict[str, Any]:
    import app.models as models
    from sqlalchemy import and_, delete, func, insert, or_, select, text, update
    from sqlalchemy.orm import joinedload, selectinload

    from app.core.config import get_settings
    from app.core.database import SessionLocal, engine

    sync_engine, shell_session = _create_shell_sync_session()

    ns: dict[str, Any] = {
        "asyncio": asyncio,
        "and_": and_,
        "or_": or_,
        "select": select,
        "func": func,
        "text": text,
        "update": update,
        "delete": delete,
        "insert": insert,
        "joinedload": joinedload,
        "selectinload": selectinload,
        "SessionLocal": SessionLocal,
        "engine": engine,
        "session": shell_session,
        "sync_engine": sync_engine,
        "get_settings": get_settings,
        "models": models,
    }
    for name in models.__all__:
        ns[name] = getattr(models, name)
    return ns


def _banner(model_names: list[str]) -> str:
    models_line = ", ".join(model_names)
    return f"""\
Python shell (async SQLAlchemy). Top-level await is enabled.

  session         sync ORM session — use for selects without await
                  session.execute(select(User).limit(5)).scalars().all()
  sync_engine     sync engine backing `session` (raw SQL: sync_engine.connect())
  SessionLocal    async session factory (async with SessionLocal() as s: ...)
  engine          async engine (same DB as `session`)
  models          package (app.models); also: {models_line}
  SQLAlchemy      select, and_, or_, func, text, update, delete, insert
  ORM loaders     joinedload, selectinload
  get_settings    app settings

Writes in `session` need session.commit() (or rollback). The session is closed on shell exit.

Example (async, same as app code):
  async with SessionLocal() as s:
      r = await s.execute(select(User).limit(5))
      r.scalars().all()
"""


def _run_asyncio_repl(ns: dict[str, Any], banner: str) -> None:
    try:
        from asyncio.__main__ import AsyncIOInteractiveConsole
    except ImportError:
        print(
            "Could not start async REPL. Use Python 3.11+ or install dev extras: uv sync --extra dev",
            file=sys.stderr,
        )
        sys.exit(1)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    console = AsyncIOInteractiveConsole(ns, loop=loop)
    try:
        console.interact(banner=banner, exitmsg="")
    finally:
        loop.close()


def main() -> None:
    ns = _build_namespace()
    model_names = list(ns["models"].__all__)
    banner = _banner(model_names)

    shell_session: Session = ns["session"]
    sync_engine: Engine = ns["sync_engine"]

    def _cleanup_shell_db() -> None:
        shell_session.close()
        sync_engine.dispose()

    atexit.register(_cleanup_shell_db)

    try:
        from traitlets.config import Config

        from IPython import start_ipython

        c = Config()
        c.InteractiveShell.autoawait = True
        c.InteractiveShell.banner1 = banner
        start_ipython(argv=[], user_ns=ns, config=c)
    except ImportError:
        _run_asyncio_repl(ns, banner)


if __name__ == "__main__":
    main()
