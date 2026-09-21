import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")


SOS_TYPE_LABELS = {
    "medical":    "Medical Emergency",
    "fire":       "Fire Emergency",
    "crime":      "Crime / Theft",
    "harassment": "Harassment",
    "accident":   "Accident",
    "other":      "Emergency",
}


def send_sos_email(receiver_email, contact_name, user_name, lat, lon, zone_name, sos_type=None):
    try:
        type_label = SOS_TYPE_LABELS.get(sos_type, "Emergency")
        subject = f"🚨 SafeTrail {type_label} Alert"

        body = f"""
Hello {contact_name},

This is an emergency alert from SafeTrail.

{user_name} has triggered a {type_label} SOS.

Location:
{zone_name}

Google Maps:
https://maps.google.com/?q={lat},{lon}

Please contact them immediately.

Emergency Numbers:
Police: 100
Ambulance: 108

Regards,
SafeTrail
"""

        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = EMAIL_USER
        msg["To"] = receiver_email

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.sendmail(EMAIL_USER, receiver_email, msg.as_string())
        server.quit()

        print(f"✅ Email sent to {receiver_email}")

        return {"success": True}

    except Exception as e:
        print(f"❌ Email Error: {e}")
        return {"success": False}