import logging
from logging.config import dictConfig


def configure_logging(level: str = "INFO") -> None:
    resolved_level = level.upper()
    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                }
            },
            "root": {
                "level": resolved_level,
                "handlers": ["console"],
            },
        }
    )
    logging.getLogger(__name__).info("Logging configured at %s level", resolved_level)
