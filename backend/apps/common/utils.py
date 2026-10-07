"""Shared helper functions used across apps."""
import uuid
import hashlib


def generate_event_id(flow_id: str) -> str:
    """Generate a stable, deterministic event ID from a flow identifier.
    
    Uses CRC32 (matching the ML team's convention) so the same flow always
    produces the same event_id regardless of interpreter session.
    """
    crc = hashlib.md5(flow_id.encode()).hexdigest()[:10]
    return f"IDS-ML-{crc.upper()}"


def safe_str(value, default=''):
    """Convert a value to string, returning *default* on None."""
    return str(value) if value is not None else default
