import os
import requests
from datetime import datetime


SOS_TYPE_LABELS = {
    "medical":    "MEDICAL EMERGENCY",
    "fire":       "FIRE EMERGENCY",
    "crime":      "CRIME / THEFT",
    "harassment": "HARASSMENT",
    "accident":   "ACCIDENT",
    "other":      "EMERGENCY",
}


def send_sos_sms(contact_name, contact_phone, user_name,
                 lat, lon, zone_name=None, sos_type=None):
    api_key   = os.getenv("FAST2SMS_API_KEY")
    maps_link = f"https://maps.google.com/?q={lat},{lon}"
    time_str  = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
    type_label = SOS_TYPE_LABELS.get(sos_type, "EMERGENCY")

    # Clean phone number — keep only 10 digits
    phone = contact_phone.strip()
    for prefix in ["+91", "91"]:
        if phone.startswith(prefix):
            phone = phone[len(prefix):]
            break
    phone = "".join(filter(str.isdigit, phone))[-10:]

    message = f"SAFETRAIL {type_label}: {user_name} needs help! "
    if zone_name:
        message += f"Location: {zone_name}. "
    message += f"GPS: {maps_link} Time: {time_str}. Please respond immediately!"

    print(f"\n{'='*55}")
    print(f"📱 SOS SMS")
    print(f"   To:      {contact_name} (+91{phone})")
    print(f"   Message: {message[:80]}...")
    print(f"{'='*55}")

    if not api_key:
        print("⚠️  No FAST2SMS_API_KEY — simulation mode")
        _simulate(phone, message)
        return {"success": True, "simulated": True, "to": phone}

    # Try route v3 first (no DLT needed)
    for route in ["v3", "q"]:
        try:
            resp = requests.get(
                "https://www.fast2sms.com/dev/bulkV2",
                params={
                    "authorization": api_key,
                    "route":         route,
                    "message":       message,
                    "language":      "english",
                    "flash":         0,
                    "numbers":       phone,
                },
                timeout=15
            )
            result = resp.json()
            print(f"   Route {route} response: {result}")

            if result.get("return") is True:
                print(f"✅ SMS sent via route {route} to +91{phone}")
                return {
                    "success":  True,
                    "platform": f"fast2sms-{route}",
                    "to":       phone,
                    "message":  message,
                }
            else:
                print(f"   Route {route} failed: {result.get('message','unknown error')}")
                continue

        except Exception as e:
            print(f"   Route {route} error: {e}")
            continue

    # Both routes failed
    print("❌ All SMS routes failed — check Fast2SMS account")
    _simulate(phone, message)
    return {"success": False, "simulated": True, "to": phone}


def _simulate(phone, message):
    print(f"\n{'='*55}")
    print(f"📱 SIMULATED SMS (would be sent to +91{phone})")
    print(f"Message: {message}")
    print(f"{'='*55}")


def send_alert_notification(contact_name, contact_phone,
                             user_name, zone_name, risk_level):
    api_key = os.getenv("FAST2SMS_API_KEY")
    phone   = "".join(filter(str.isdigit, contact_phone))[-10:]
    message = (
        f"SAFETRAIL WARNING: {user_name} entered a "
        f"{risk_level.upper()} zone ({zone_name}). "
        f"They have been alerted automatically."
    )

    if api_key:
        try:
            resp = requests.get(
                "https://www.fast2sms.com/dev/bulkV2",
                params={
                    "authorization": api_key,
                    "route":         "v3",
                    "message":       message,
                    "language":      "english",
                    "flash":         0,
                    "numbers":       phone,
                },
                timeout=15
            )
            result = resp.json()
            return result.get("return") is True
        except Exception as e:
            print(f"Alert SMS error: {e}")
            return False
    else:
        print(f"[SIMULATED] Alert to +91{phone}: {message}")
        return True