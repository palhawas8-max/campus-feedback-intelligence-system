"""
sync_mongo.py — Export all campus feedback data from SQLite to MongoDB Atlas.
Populates users, locations, surveys, and issue_tickets collections.
"""
import sqlite3
import json
import certifi
from pymongo import MongoClient

MONGODB_URL = "mongodb+srv://palhawas8_db_user:VRZfOjitAr4LhjPz@cluster0.1bx8exf.mongodb.net/?retryWrites=true&w=majority"
DB_NAME = "campus_feedback"

def sync_to_mongodb():
    print("[1/5] Connecting to MongoDB Atlas...")
    client = MongoClient(MONGODB_URL, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=10000)
    db = client[DB_NAME]
    client.admin.command('ping')
    print("[SUCCESS] MongoDB Atlas connected!")

    print("[2/5] Reading SQLite campus_feedback.db...")
    sqlite_conn = sqlite3.connect("campus_feedback.db")
    sqlite_conn.row_factory = sqlite3.Row
    cur = sqlite_conn.cursor()

    # 1. Sync Users
    cur.execute("SELECT user_id, name, email, role, created_at FROM users")
    users = [dict(row) for row in cur.fetchall()]
    if users:
        db.users.drop()
        for u in users:
            u["_id"] = u["user_id"]
        db.users.insert_many(users)
        print(f" -> Synced {len(users)} users to MongoDB 'users' collection.")

    # 2. Sync Locations
    cur.execute("SELECT location_id, block_name, floor, room_number FROM locations")
    locations = [dict(row) for row in cur.fetchall()]
    locations_map = {loc["location_id"]: loc for loc in locations}
    if locations:
        db.locations.drop()
        for loc in locations:
            loc["_id"] = loc["location_id"]
        db.locations.insert_many(locations)
        print(f" -> Synced {len(locations)} locations to MongoDB 'locations' collection.")

    # 3. Sync Surveys + Analysis + Tickets
    cur.execute("""
        SELECT 
            s.survey_id, s.user_id, s.location_id, s.raw_text, s.input_mode, s.created_at,
            u.name as user_name, u.email as user_email, u.role as user_role,
            l.block_name, l.floor, l.room_number,
            a.analysis_id, a.cleaned_text, a.extracted_keywords, a.sentiment_compound, 
            a.urgency_score, a.urgency_level, a.assigned_dept,
            t.ticket_id, t.status as ticket_status, t.created_at as ticket_created_at, t.resolved_at as ticket_resolved_at
        FROM surveys s
        LEFT JOIN users u ON s.user_id = u.user_id
        LEFT JOIN locations l ON s.location_id = l.location_id
        LEFT JOIN analysis_results a ON s.survey_id = a.survey_id
        LEFT JOIN issue_tickets t ON a.analysis_id = t.analysis_id
        ORDER BY s.survey_id ASC
    """)
    rows = cur.fetchall()

    survey_docs = []
    ticket_docs = []

    for r in rows:
        row = dict(r)
        
        # Parse extracted_keywords JSON
        keywords = []
        if row.get("extracted_keywords"):
            try:
                keywords = json.loads(row["extracted_keywords"])
            except Exception:
                keywords = [row["extracted_keywords"]]

        survey_doc = {
            "_id": row["survey_id"],
            "survey_id": row["survey_id"],
            "user": {
                "user_id": row["user_id"],
                "name": row["user_name"],
                "email": row["user_email"],
                "role": row["user_role"]
            },
            "location": {
                "location_id": row["location_id"],
                "block_name": row["block_name"],
                "floor": row["floor"],
                "room_number": row["room_number"]
            },
            "raw_text": row["raw_text"],
            "input_mode": row["input_mode"],
            "created_at": row["created_at"],
            "analysis": {
                "analysis_id": row["analysis_id"],
                "cleaned_text": row["cleaned_text"],
                "extracted_keywords": keywords,
                "sentiment_compound": row["sentiment_compound"],
                "urgency_score": row["urgency_score"],
                "urgency_level": row["urgency_level"],
                "assigned_dept": row["assigned_dept"]
            },
            "ticket": {
                "ticket_id": row["ticket_id"],
                "status": row["ticket_status"],
                "created_at": row["ticket_created_at"],
                "resolved_at": row["ticket_resolved_at"]
            }
        }
        survey_docs.append(survey_doc)

        if row.get("ticket_id"):
            ticket_docs.append({
                "_id": row["ticket_id"],
                "ticket_id": row["ticket_id"],
                "survey_id": row["survey_id"],
                "status": row["ticket_status"],
                "assigned_dept": row["assigned_dept"],
                "urgency_level": row["urgency_level"],
                "urgency_score": row["urgency_score"],
                "location": f"{row['block_name']} - {row['floor']} ({row['room_number']})",
                "raw_text": row["raw_text"],
                "created_at": row["ticket_created_at"],
                "resolved_at": row["ticket_resolved_at"]
            })

    if survey_docs:
        db.surveys.drop()
        db.surveys.insert_many(survey_docs)
        print(f" -> Synced {len(survey_docs)} feedback entries to MongoDB 'surveys' collection.")

    if ticket_docs:
        db.issue_tickets.drop()
        db.issue_tickets.insert_many(ticket_docs)
        print(f" -> Synced {len(ticket_docs)} tickets to MongoDB 'issue_tickets' collection.")

    # Create indexes for high-speed queries
    db.surveys.create_index("survey_id")
    db.surveys.create_index("location.block_name")
    db.surveys.create_index("analysis.assigned_dept")
    db.surveys.create_index("analysis.urgency_level")
    db.issue_tickets.create_index("status")
    db.issue_tickets.create_index("urgency_level")

    print("[SUCCESS] All campus data successfully migrated and indexed in MongoDB Atlas!")
    print(f"Collections present in database '{DB_NAME}':", db.list_collection_names())

if __name__ == "__main__":
    sync_to_mongodb()
