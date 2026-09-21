from database import init_db
from utils.auth_helper import hash_password

db = init_db()

email = "anvaishnavi19@gmail.com"
new_password = "admin123"

result = db["users"].update_one(
    {"email": email},
    {"$set": {"password": hash_password(new_password), "role": "admin"}}
)

if result.matched_count:
    print("✅ Admin account updated successfully!")
    print("Email:", email)
    print("Password:", new_password)
    print("Role: admin")
else:
    print("❌ User not found")