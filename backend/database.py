from pymongo import MongoClient
from config import Config

client = None
db = None

def init_db():
    global client, db
    try:
        client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")  # Test the connection
        db = client["safetrail"]
        print("✅ MongoDB connected successfully")
        return db
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        raise

def get_db():
    if db is None:
        return init_db()
    return db