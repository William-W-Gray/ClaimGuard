"""Consistent API response envelope: {success, message, data, metadata, errors}."""
from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: str | None = None


class Envelope(BaseModel, Generic[T]):
    success: bool = True
    message: str = "OK"
    data: T | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    errors: list[ErrorDetail] = Field(default_factory=list)


class PageMeta(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_prev: bool


def success(
    data: Any = None,
    message: str = "OK",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "success": True,
        "message": message,
        "data": data,
        "metadata": metadata or {},
        "errors": [],
    }


def paginated(
    items: Any,
    page: int,
    page_size: int,
    total_items: int,
    message: str = "OK",
) -> dict[str, Any]:
    total_pages = max(1, (total_items + page_size - 1) // page_size) if page_size else 1
    meta = PageMeta(
        page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )
    return {
        "success": True,
        "message": message,
        "data": items,
        "metadata": {"pagination": meta.model_dump(by_alias=True)},
        "errors": [],
    }


def failure(
    message: str,
    errors: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "success": False,
        "message": message,
        "data": None,
        "metadata": {},
        "errors": errors or [],
    }
