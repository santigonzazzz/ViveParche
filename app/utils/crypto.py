import random
import string
import hashlib

def generate_user_hash(user_id: str) -> str:
    """Generate a unique 6-character short code for a user."""
    # We use a mix of random and hash to ensure uniqueness but keep it short
    chars = string.ascii_uppercase + string.digits
    # Seed with user_id for partial determinism if needed, but we'll stick to random for now
    return ''.join(random.choices(chars, k=6))

def generate_qr_payload(user_id: str, hash_id: str) -> str:
    """Generate the payload for the user's passport QR code."""
    # Format: PARCHE:HASH_ID:USER_ID
    return f"PARCHE:{hash_id}:{user_id}"
