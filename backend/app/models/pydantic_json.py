"""SQLAlchemy JSON columns backed by Pydantic models."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel
from sqlalchemy import JSON
from sqlalchemy.types import TypeDecorator


class PydanticJSON(TypeDecorator):
    """Persist a dict in JSON; expose a Pydantic model on the ORM instance."""

    impl = JSON
    cache_ok = True

    def __init__(
        self,
        model: type[BaseModel],
        *,
        coerce_null_to_empty: bool = False,
    ) -> None:
        super().__init__()
        self._model = model
        self._coerce_null_to_empty = coerce_null_to_empty

    def process_bind_param(
        self, value: Any, dialect: Any
    ) -> dict[str, Any] | list[Any] | None:
        if value is None:
            if self._coerce_null_to_empty:
                return self._model().model_dump(mode="json")
            return None
        if isinstance(value, BaseModel):
            return value.model_dump(mode="json")
        return self._model.model_validate(value).model_dump(mode="json")

    def process_result_value(self, value: Any, dialect: Any) -> BaseModel | None:
        if value is None:
            if self._coerce_null_to_empty:
                return self._model()
            return None
        return self._model.model_validate(value)
