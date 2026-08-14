import os
import json
import uuid
import sqlite3
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/resume_parser"
)

USE_SQLITE = False

sqlite_db_path = os.path.join(
    os.path.dirname(__file__),
    "resume_parser.db"
)

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None
    RealDictCursor = None


def get_connection():
    global USE_SQLITE

    if USE_SQLITE or psycopg2 is None:
        return sqlite3.connect(sqlite_db_path)

    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        print(
            f"\n[DB WARNING] Failed to connect to PostgreSQL: {e}"
        )
        print(
            f"[DB INFO] Falling back to SQLite database at: "
            f"{sqlite_db_path}\n"
        )
        USE_SQLITE = True
        return sqlite3.connect(sqlite_db_path)


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    is_sqlite = isinstance(conn, sqlite3.Connection)

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS jobs (
            job_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT,
            required_skills TEXT,
            preferred_skills TEXT,
            min_experience INTEGER DEFAULT 0
        )
        """
    )

    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM jobs")
    count = cursor.fetchone()[0]

    if count == 0:
        print("[DB INFO] Database is empty. Seeding initial job postings...")

        from jobs import JOBS

        query = (
            """
            INSERT INTO jobs (
                job_id,
                title,
                company,
                location,
                description,
                required_skills,
                preferred_skills,
                min_experience
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """
            if is_sqlite
            else
            """
            INSERT INTO jobs (
                job_id,
                title,
                company,
                location,
                description,
                required_skills,
                preferred_skills,
                min_experience
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
        )

        for job in JOBS:
            job_id = job.get("id") or f"job-{uuid.uuid4().hex[:6]}"

            cursor.execute(
                query,
                (
                    job_id,
                    job["title"],
                    job["company"],
                    job["location"],
                    job.get("description", ""),
                    json.dumps(job.get("required_skills", [])),
                    json.dumps(job.get("preferred_skills", [])),
                    job.get("min_experience", 0),
                ),
            )

        conn.commit()
        print(f"[DB INFO] Seeded {len(JOBS)} jobs.")

    cursor.close()
    conn.close()


def get_all_jobs():
    conn = get_connection()
    is_sqlite = isinstance(conn, sqlite3.Connection)

    if is_sqlite:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM jobs")
        rows = cursor.fetchall()

        jobs = [
            {
                "job_id": row["job_id"],
                "title": row["title"],
                "company": row["company"],
                "location": row["location"],
                "description": row["description"],
                "required_skills": json.loads(
                    row["required_skills"] or "[]"
                ),
                "preferred_skills": json.loads(
                    row["preferred_skills"] or "[]"
                ),
                "min_experience": row["min_experience"],
            }
            for row in rows
        ]
    else:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM jobs")
        rows = cursor.fetchall()

        jobs = [
            {
                "job_id": row["job_id"],
                "title": row["title"],
                "company": row["company"],
                "location": row["location"],
                "description": row["description"],
                "required_skills": json.loads(
                    row["required_skills"] or "[]"
                ),
                "preferred_skills": json.loads(
                    row["preferred_skills"] or "[]"
                ),
                "min_experience": row["min_experience"],
            }
            for row in rows
        ]

    cursor.close()
    conn.close()

    return jobs


def add_job_posting(job: dict):
    conn = get_connection()
    cursor = conn.cursor()
    is_sqlite = isinstance(conn, sqlite3.Connection)

    job_id = f"job-{uuid.uuid4().hex[:6]}"

    query = (
        """
        INSERT INTO jobs (
            job_id,
            title,
            company,
            location,
            description,
            required_skills,
            preferred_skills,
            min_experience
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        if is_sqlite
        else
        """
        INSERT INTO jobs (
            job_id,
            title,
            company,
            location,
            description,
            required_skills,
            preferred_skills,
            min_experience
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
    )

    cursor.execute(
        query,
        (
            job_id,
            job["title"],
            job["company"],
            job["location"],
            job.get("description", ""),
            json.dumps(job.get("required_skills", [])),
            json.dumps(job.get("preferred_skills", [])),
            job.get("min_experience", 0),
        ),
    )

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "job_id": job_id,
        **job,
    }