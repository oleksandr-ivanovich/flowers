"""Create the first owner user. Usage:

    docker compose exec api python -m app.scripts.create_owner

Interactively prompts for email, full name, and password.
"""
from __future__ import annotations

import getpass
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import SessionLocal
from app.db.models import User, UserRole


def main() -> int:
    email = input("Email: ").strip()
    full_name = input("Повне імʼя: ").strip()
    password = getpass.getpass("Пароль: ")
    if len(password) < 6:
        print("Пароль має бути не менше 6 символів", file=sys.stderr)
        return 1
    confirm = getpass.getpass("Підтвердіть пароль: ")
    if password != confirm:
        print("Паролі не збігаються", file=sys.stderr)
        return 1

    with SessionLocal() as db:
        if db.execute(select(User).where(User.email == email)).scalar_one_or_none():
            print(f"Користувач {email} вже існує", file=sys.stderr)
            return 1
        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role=UserRole.owner.value,
            store_id=None,
        )
        db.add(user)
        db.commit()
        print(f"Owner {email} створено (id={user.id})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
