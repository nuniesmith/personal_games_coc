import base64
import secrets
import uuid


def generate_token() -> str:
    """
    Generate a secure and unique token for use in the database.
    Combines UUID and secrets for added randomness.

    Returns:
        str: A URL-safe base64-encoded token.
    """
    random_uuid = uuid.uuid4()
    uuid_bytes = random_uuid.bytes
    random_bytes = secrets.token_bytes(16)
    combined_bytes = uuid_bytes + random_bytes
    token = base64.urlsafe_b64encode(combined_bytes).rstrip(b'=').decode('utf-8')
    return token
