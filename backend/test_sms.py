"""
Run this to test Fast2SMS directly.
Command: python test_sms.py
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("FAST2SMS_API_KEY")

if not api_key:
    print("❌ FAST2SMS_API_KEY not found in .env")
    exit()

print(f"✅ API Key found: {api_key[:8]}...{api_key[-4:]}")

# Test phone — change this to your own number to test
TEST_PHONE = "9980537609"  # ← PUT YOUR OWN NUMBER HERE

message = "SAFETRAIL TEST: This is a test SMS from SafeTrail SOS system. If you received this, SMS is working!"

print(f"\nSending test SMS to {TEST_PHONE}...")

for route in ["v3", "q"]:
    print(f"\nTrying route: {route}")
    try:
        resp = requests.get(
            "https://www.fast2sms.com/dev/bulkV2",
            params={
                "authorization": api_key,
                "route":         route,
                "message":       message,
                "language":      "english",
                "flash":         0,
                "numbers":       TEST_PHONE,
            },
            timeout=15
        )
        result = resp.json()
        print(f"Response: {result}")

        if result.get("return") is True:
            print(f"✅ SUCCESS via route {route}!")
            print(f"   SMS sent to {TEST_PHONE}")
            break
        else:
            print(f"❌ Failed: {result.get('message', 'unknown')}")

    except Exception as e:
        print(f"❌ Error: {e}")