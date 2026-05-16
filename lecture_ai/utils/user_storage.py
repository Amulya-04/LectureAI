import json
import hashlib
import os
from datetime import date, datetime
from pathlib import Path


USERS_FILE = Path("lecture_data") / "users.json"


def _hash_password(password: str) -> str:
    """SHA-256 hash of password."""
    return hashlib.sha256(password.encode()).hexdigest()


def _derive_label(score: float) -> str:
    if score < 40:
        return "Beginner"
    elif score < 75:
        return "Intermediate"
    else:
        return "Advanced"


class UserStorage:
    """
    JSON-based user account storage with:
    - Hashed passwords
    - Role-based access (student / faculty)
    - Dynamic level tracking via weighted rolling average
    - Daily streak tracking
    """

    def __init__(self, base_dir: str = "lecture_data"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)
        self.users_path = self.base_dir / "users.json"
        self._ensure_file()

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _ensure_file(self):
        if not self.users_path.exists():
            self._write({})

    def _read(self) -> dict:
        with open(self.users_path, "r") as f:
            return json.load(f)

    def _write(self, data: dict):
        with open(self.users_path, "w") as f:
            json.dump(data, f, indent=2)

    # ── CRUD ─────────────────────────────────────────────────────────────────

    def create_user(self, username: str, password: str, role: str = "student") -> dict:
        """
        Create a new user. Returns {"ok": True} or {"ok": False, "error": "..."}.
        role must be 'student' or 'faculty'.
        """
        users = self._read()
        username = username.strip().lower()

        if not username or not password:
            return {"ok": False, "error": "Username and password are required."}
        if role not in ("student", "faculty"):
            return {"ok": False, "error": "Role must be 'student' or 'faculty'."}
        if username in users:
            return {"ok": False, "error": f"Username '{username}' already exists."}

        users[username] = {
            "username": username,
            "password_hash": _hash_password(password),
            "role": role,
            # Level tracking
            "level_score": 0.0,
            "level_label": "Beginner",
            "assessed": False,
            "progress_history": [],   # [{"date": "...", "score": 80, "label": "..."}]
            # Streak tracking
            "streak": 0,
            "last_active_date": None,
            "longest_streak": 0,
        }

        self._write(users)
        return {"ok": True}

    def verify_user(self, username: str, password: str) -> dict | None:
        """
        Verify credentials. Returns user dict (without password_hash) or None.
        """
        users = self._read()
        username = username.strip().lower()
        user = users.get(username)
        if user and user["password_hash"] == _hash_password(password):
            safe = {k: v for k, v in user.items() if k != "password_hash"}
            return safe
        return None

    def get_user(self, username: str) -> dict | None:
        """Fetch user data by username (without password_hash)."""
        users = self._read()
        user = users.get(username.strip().lower())
        if user:
            return {k: v for k, v in user.items() if k != "password_hash"}
        return None

    def update_progress(self, username: str, quiz_score: float) -> dict:
        """
        Record a quiz score and recalculate the user's level.
        Uses a weighted rolling average: newer scores have more weight.
        Returns the updated user dict (no password_hash).
        """
        users = self._read()
        username = username.strip().lower()
        user = users.get(username)
        if not user:
            return {}

        history = user.get("progress_history", [])

        # Weighted rolling average: weight of each entry = its index+1
        history.append({
            "date": datetime.now().isoformat(),
            "score": quiz_score,
        })

        n = len(history)
        weighted_sum = sum((i + 1) * h["score"] for i, h in enumerate(history))
        total_weight = n * (n + 1) / 2
        new_score = round(weighted_sum / total_weight, 2)
        new_label = _derive_label(new_score)

        user["level_score"] = new_score
        user["level_label"] = new_label
        user["progress_history"] = history
        user["assessed"] = True

        self._write(users)
        return {k: v for k, v in user.items() if k != "password_hash"}

    def mark_assessed(self, username: str):
        """Mark a student as having completed the one-time login exam."""
        users = self._read()
        username = username.strip().lower()
        if username in users:
            users[username]["assessed"] = True
            self._write(users)

    def record_activity(self, username: str) -> dict:
        """
        Call on every student login to update the daily streak.
        Returns {"streak": N, "longest_streak": M, "status": "continued"|"started"|"reset"|"already_counted"}
        """
        users = self._read()
        username = username.strip().lower()
        user = users.get(username)
        if not user:
            return {}

        today = date.today().isoformat()
        last = user.get("last_active_date")
        streak = user.get("streak", 0)
        longest = user.get("longest_streak", 0)

        if last is None:
            # First ever login
            streak = 1
            status = "started"
        elif last == today:
            # Already logged in today — don't double-count
            status = "already_counted"
        else:
            # Check if yesterday
            last_date = date.fromisoformat(last)
            delta = (date.today() - last_date).days
            if delta == 1:
                streak += 1
                status = "continued"
            else:
                streak = 1
                status = "reset"

        if streak > longest:
            longest = streak

        user["streak"] = streak
        user["longest_streak"] = longest
        user["last_active_date"] = today
        self._write(users)

        return {
            "streak": streak,
            "longest_streak": longest,
            "status": status,
        }

    def list_users(self, role: str = None) -> list:
        """List all users, optionally filtered by role."""
        users = self._read()
        result = []
        for u in users.values():
            if role is None or u.get("role") == role:
                result.append({k: v for k, v in u.items() if k != "password_hash"})
        return result
