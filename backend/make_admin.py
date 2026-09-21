from database import init_db

db = init_db()
users = db["users"]

result = users.update_one(
    {"email": "harshithanurs1@gmail.com"},
    {"$set": {"role": "admin"}}
)

if result.modified_count > 0:
    print("✅ Admin role granted to harshithanurs1@gmail.com")
    print("   Now logout and login again to see Admin Panel")
else:
    print("⚠️  User not found or already admin")
    print("   Check the email address is correct")