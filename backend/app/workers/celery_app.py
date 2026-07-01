"""Celery application + beat schedule for background processing."""
from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "claimguard",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=240,
    worker_max_tasks_per_child=200,
    task_acks_late=True,
)

# Periodic jobs (run via `celery beat`).
celery_app.conf.beat_schedule = {
    "recalculate-trustscores-nightly": {
        "task": "app.workers.tasks.recalculate_all_trustscores",
        "schedule": crontab(hour=2, minute=0),
    },
    "aggregate-analytics-hourly": {
        "task": "app.workers.tasks.aggregate_analytics",
        "schedule": crontab(minute=0),
    },
}
