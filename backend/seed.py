"""
Seed the database with default users.
Run from backend/ directory:  python seed.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.auth.models import User
from app.auth.service import hash_password

Base.metadata.create_all(bind=engine)

SEED_USERS = [
    {"email": "admin@capdash.io",   "name": "Admin User",    "role": "admin",   "password": "Admin@123"},
    {"email": "analyst@capdash.io", "name": "Analyst User",  "role": "analyst", "password": "Analyst@123"},
    {"email": "viewer@capdash.io",  "name": "Viewer User",   "role": "viewer",  "password": "Viewer@123"},
]


def seed():
    db = SessionLocal()
    try:
        created = 0
        for u in SEED_USERS:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if existing:
                print(f"  [skip] {u['email']} already exists")
                continue
            user = User(
                email=u["email"],
                name=u["name"],
                role=u["role"],
                hashed_password=hash_password(u["password"]),
                is_active=True,
            )
            db.add(user)
            created += 1
            print(f"  [+] Created {u['role']}: {u['email']}")
        db.commit()
        print(f"\nDone. {created} user(s) created.")
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding database...")
    seed()
