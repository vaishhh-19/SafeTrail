from database import init_db

db = init_db()

result = db["users"].update_one(
    {"email": "harshithanurs1@gmail.com"},
    {"$set": {"emergency_contacts.0.email": "1jt23cs050@jyothyit.ac.in"}}
)

print(f"Updated: {result.modified_count} document")