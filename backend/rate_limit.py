"""Simple in-memory rate limiter for auth endpoints."""

import time
from collections import defaultdict
from typing import Tuple

_buckets: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> Tuple[bool, str]:
    """Return (allowed, message)."""
    now = time.time()
    bucket = _buckets[key]
    bucket[:] = [t for t in bucket if now - t < window_seconds]
    if len(bucket) >= max_requests:
        return False, "Too many requests. Please try again later."
    bucket.append(now)
    return True, ""
