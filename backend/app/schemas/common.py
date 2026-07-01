"""Shared schema base (camelCase aliasing) + pagination/query helpers."""
from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict
from pydantic.alias_generators import to_camel

# Coerces UUID (and anything) to str so ORM UUID PKs validate into str fields.
StrId = Annotated[str, BeforeValidator(lambda v: str(v) if v is not None else v)]


class CamelModel(BaseModel):
    """Serializes to camelCase (frontend contract) while accepting snake_case too."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 10

    @property
    def offset(self) -> int:
        return (max(self.page, 1) - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size
