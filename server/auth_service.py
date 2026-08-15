import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional


GOOGLE_CLIENT_ID = (os.getenv("GOOGLE_CLIENT_ID") or os.getenv("Client_ID") or "").strip()
SESSION_TTL_SECONDS = int(os.getenv("AUTH_SESSION_TTL_SECONDS", "604800"))
SESSION_SECRET = os.getenv("AUTH_SESSION_SECRET", "").strip() or secrets.token_urlsafe(48)
COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true"
ACCOUNT_DB = Path(os.getenv(
    "AUTH_DATABASE_PATH",
    str(Path(__file__).resolve().parent.parent / "data" / "runtime" / "igris_accounts.db"),
))


def initialize_accounts() -> None:
    ACCOUNT_DB.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(ACCOUNT_DB) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                google_sub TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                picture TEXT,
                created_at INTEGER NOT NULL,
                last_login_at INTEGER NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_sub TEXT NOT NULL,
                title TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (user_sub) REFERENCES users(google_sub) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                source TEXT,
                visualization_json TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute("CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_sub, updated_at DESC)")
        connection.execute("CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, id)")


def public_config() -> Dict[str, Any]:
    return {
        "google_enabled": bool(GOOGLE_CLIENT_ID),
        "google_client_id": GOOGLE_CLIENT_ID,
        "generation_requires_sign_in": True,
    }


def verify_google_credential(credential: str) -> Dict[str, Any]:
    if not GOOGLE_CLIENT_ID:
        raise ValueError("Google sign-in is not configured on this server.")
    if not credential:
        raise ValueError("Google did not return an identity credential.")

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError as error:
        raise RuntimeError("Google authentication dependencies are not installed.") from error

    claims = id_token.verify_oauth2_token(
        credential,
        google_requests.Request(),
        GOOGLE_CLIENT_ID,
    )
    if not claims.get("email_verified"):
        raise ValueError("Use a Google account with a verified email address.")

    user = {
        "sub": claims["sub"],
        "email": claims["email"],
        "name": claims.get("name") or claims["email"].split("@", 1)[0],
        "picture": claims.get("picture", ""),
    }
    _upsert_user(user)
    return user


def _upsert_user(user: Dict[str, Any]) -> None:
    now = int(time.time())
    with sqlite3.connect(ACCOUNT_DB) as connection:
        connection.execute(
            """
            INSERT INTO users (google_sub, email, name, picture, created_at, last_login_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(google_sub) DO UPDATE SET
                email = excluded.email,
                name = excluded.name,
                picture = excluded.picture,
                last_login_at = excluded.last_login_at
            """,
            (user["sub"], user["email"], user["name"], user.get("picture", ""), now, now),
        )


def create_session(user: Dict[str, Any]) -> str:
    payload = {
        "sub": user["sub"],
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture", ""),
        "iat": int(time.time()),
        "exp": int(time.time()) + SESSION_TTL_SECONDS,
    }
    encoded = _encode(json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    signature = _sign(encoded)
    return f"{encoded}.{signature}"


def verify_session(token: Optional[str]) -> Optional[Dict[str, Any]]:
    if not token or "." not in token:
        return None
    encoded, signature = token.rsplit(".", 1)
    if not hmac.compare_digest(signature, _sign(encoded)):
        return None
    try:
        payload = json.loads(_decode(encoded).decode("utf-8"))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return None
    if int(payload.get("exp", 0)) <= int(time.time()):
        return None
    return {key: payload.get(key) for key in ("sub", "email", "name", "picture")}


def cookie_options() -> Dict[str, Any]:
    return {
        "key": "igris_session",
        "httponly": True,
        "secure": COOKIE_SECURE,
        "samesite": "lax",
        "max_age": SESSION_TTL_SECONDS,
        "path": "/",
    }


def create_conversation(user_sub: str, title: str = "New groundwater question") -> Dict[str, Any]:
    conversation_id = uuid.uuid4().hex
    now = int(time.time())
    clean_title = _conversation_title(title)
    with _account_connection() as connection:
        connection.execute(
            "INSERT INTO conversations (id, user_sub, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (conversation_id, user_sub, clean_title, now, now),
        )
    return {"id": conversation_id, "title": clean_title, "created_at": now, "updated_at": now}


def ensure_conversation(user_sub: str, conversation_id: Optional[str], first_message: str) -> Dict[str, Any]:
    if conversation_id:
        with _account_connection() as connection:
            row = connection.execute(
                "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ? AND user_sub = ?",
                (conversation_id, user_sub),
            ).fetchone()
        if row:
            return dict(row)
        raise PermissionError("Conversation not found for this account.")
    return create_conversation(user_sub, first_message)


def save_exchange(
    user_sub: str,
    conversation_id: str,
    question: str,
    answer: str,
    source: str,
    visualization: Optional[Dict[str, Any]],
) -> None:
    now = int(time.time())
    with _account_connection() as connection:
        owner = connection.execute(
            "SELECT 1 FROM conversations WHERE id = ? AND user_sub = ?",
            (conversation_id, user_sub),
        ).fetchone()
        if not owner:
            raise PermissionError("Conversation not found for this account.")
        connection.execute(
            "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, 'user', ?, ?)",
            (conversation_id, question, now),
        )
        connection.execute(
            """
            INSERT INTO messages (conversation_id, role, content, source, visualization_json, created_at)
            VALUES (?, 'assistant', ?, ?, ?, ?)
            """,
            (conversation_id, answer, source, json.dumps(visualization, ensure_ascii=False) if visualization else None, now),
        )
        connection.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ? AND user_sub = ?",
            (now, conversation_id, user_sub),
        )


def list_conversations(user_sub: str, limit: int = 30) -> list[Dict[str, Any]]:
    with _account_connection() as connection:
        rows = connection.execute(
            """
            SELECT c.id, c.title, c.created_at, c.updated_at, COUNT(m.id) AS message_count
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE c.user_sub = ?
            GROUP BY c.id
            ORDER BY c.updated_at DESC
            LIMIT ?
            """,
            (user_sub, limit),
        ).fetchall()
    return [dict(row) for row in rows]


def get_conversation(user_sub: str, conversation_id: str) -> Optional[Dict[str, Any]]:
    with _account_connection() as connection:
        conversation = connection.execute(
            "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ? AND user_sub = ?",
            (conversation_id, user_sub),
        ).fetchone()
        if not conversation:
            return None
        messages = connection.execute(
            """
            SELECT id, role, content, source, visualization_json, created_at
            FROM messages WHERE conversation_id = ? ORDER BY id
            """,
            (conversation_id,),
        ).fetchall()
    result = dict(conversation)
    result["messages"] = []
    for row in messages:
        message = dict(row)
        raw_visualization = message.pop("visualization_json", None)
        message["visualization"] = json.loads(raw_visualization) if raw_visualization else None
        result["messages"].append(message)
    return result


def delete_conversation(user_sub: str, conversation_id: str) -> bool:
    with _account_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM conversations WHERE id = ? AND user_sub = ?",
            (conversation_id, user_sub),
        )
    return cursor.rowcount > 0


def _account_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(ACCOUNT_DB)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def _conversation_title(question: str) -> str:
    compact = " ".join(str(question).split())
    return (compact[:64].rstrip(".,?! ") or "New groundwater question")


def _sign(encoded: str) -> str:
    digest = hmac.new(SESSION_SECRET.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256).digest()
    return _encode(digest)


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
