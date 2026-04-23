from typing import Any, Dict, List, Optional, Sequence, Union

from starlette.requests import Request
from starlette_admin import BaseModelView
from tortoise import Model
from tortoise.queryset import QuerySet


class TortoiseModelView(BaseModelView):
    model: type[Model]

    def _qs(self) -> QuerySet:
        return self.model.all()

    def _apply_where(self, qs: QuerySet, where: Union[Dict, str, None]) -> QuerySet:
        if not where:
            return qs
        if isinstance(where, str):
            # full-text search: try matching any string field
            from tortoise.expressions import Q
            filters = Q()
            for field_name, field_obj in self.model._meta.fields_map.items():
                from tortoise.fields import CharField, TextField
                if isinstance(field_obj, (CharField, TextField)):
                    filters |= Q(**{f"{field_name}__icontains": where})
            return qs.filter(filters)
        return qs

    def _apply_order(self, qs: QuerySet, order_by: Optional[List[str]]) -> QuerySet:
        if not order_by:
            return qs
        clauses = []
        for clause in order_by:
            parts = clause.rsplit(" ", 1)
            field = parts[0]
            direction = parts[1].lower() if len(parts) == 2 else "asc"
            clauses.append(f"-{field}" if direction == "desc" else field)
        return qs.order_by(*clauses)

    async def find_all(
        self,
        request: Request,
        skip: int = 0,
        limit: int = 100,
        where: Union[Dict[str, Any], str, None] = None,
        order_by: Optional[List[str]] = None,
    ) -> Sequence[Any]:
        qs = self._apply_where(self._qs(), where)
        qs = self._apply_order(qs, order_by)
        return await qs.offset(skip).limit(limit)

    async def count(self, request: Request, where: Union[Dict[str, Any], str, None] = None) -> int:
        qs = self._apply_where(self._qs(), where)
        return await qs.count()

    async def find_by_pk(self, request: Request, pk: Any) -> Any:
        return await self.model.get_or_none(pk=pk)

    async def find_by_pks(self, request: Request, pks: List[Any]) -> Sequence[Any]:
        return await self.model.filter(pk__in=pks)

    async def create(self, request: Request, data: Dict) -> Any:
        obj = self.model(**data)
        await obj.save()
        return obj

    async def edit(self, request: Request, pk: Any, data: Dict[str, Any]) -> Any:
        obj = await self.model.get(pk=pk)
        for key, value in data.items():
            setattr(obj, key, value)
        await obj.save()
        return obj

    async def delete(self, request: Request, pks: List[Any]) -> Optional[int]:
        deleted, _ = await self.model.filter(pk__in=pks).delete()
        return deleted