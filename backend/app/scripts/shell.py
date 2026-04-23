"""Interactive shell with Tortoise ORM and models preloaded (Django shell_plus–style).

From `backend/` with dev extras (IPython + top-level await):

    uv sync --extra dev
    uv run python -m app.scripts.shell

Or:

    uv run api-shell
"""

from __future__ import annotations

import asyncio
import sys
from typing import Any


def _build_namespace() -> dict[str, Any]:
    import app.models as models

    from app.core.config import get_settings
    from app.core.database import TORTOISE_ORM, close_db, init_db

    ns: dict[str, Any] = {
        "asyncio": asyncio,
        "get_settings": get_settings,
        "init_db": init_db,
        "close_db": close_db,
        "TORTOISE_ORM": TORTOISE_ORM,
        "models": models,
    }
    for name in models.__all__:
        ns[name] = getattr(models, name)
    return ns


def _banner(model_names: list[str]) -> str:
    models_line = ", ".join(model_names)
    return f"""\
Python shell (Tortoise ORM). Top-level await is enabled.

  init_db / close_db   async open/close the Tortoise connection
  models               package (app.models); also: {models_line}
  get_settings         app settings

Example:
  await init_db()
  users = await User.all()
  await close_db()
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
