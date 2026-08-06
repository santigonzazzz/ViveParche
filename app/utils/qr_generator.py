"""
QR code token generator utility for VibeMap AI.
Generates unique booking tokens for QR codes.
"""

import hashlib
import uuid
from datetime import datetime
from uuid import UUID


def generate_booking_token(event_id: UUID, user_id: UUID) -> str:
    """
    Generate a unique token for a booking QR code.

    Args:
        event_id: The UUID of the event being booked
        user_id: The UUID of the user making the booking

    Returns:
        A unique 16-character token string for the booking
    """
    # Combine event_id, user_id, timestamp, and a random UUID for uniqueness
    timestamp = datetime.utcnow().isoformat()
    random_component = str(uuid.uuid4())

    # Create the hash source string using string representation of UUIDs
    hash_source = f"{str(event_id)}-{str(user_id)}-{timestamp}-{random_component}"

    # Generate SHA-256 hash
    hash_object = hashlib.sha256(hash_source.encode())
    hash_hex = hash_object.hexdigest()

    # Return first 16 characters as the booking token
    return hash_hex[:16].upper()

