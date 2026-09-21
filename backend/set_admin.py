from database import init_db

db = init_db()

email = "anvaishnavi19@gmail.com"

result = db["users"].update_one(
    {"email": email},
    {"$set": {"role": "admin"}}
)

if result.matched_count:
    print("✅ Admin role set successfully!")
else:
    print("❌ User not found:", email)

user = db["users"].find_one(
    {"email": email},
    {"email": 1, "role": 1}
)

print("Account:", user)