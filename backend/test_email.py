import smtplib
import os
from dotenv import load_dotenv

load_dotenv()

EMAIL = os.getenv("EMAIL_USER")
PASSWORD = os.getenv("EMAIL_PASSWORD")

try:
    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()

    server.login(EMAIL, PASSWORD)

    server.sendmail(
        EMAIL,
        EMAIL,
        "Subject: SafeTrail Test\n\nThis is a test email from SafeTrail."
    )

    server.quit()

    print("✅ Email sent successfully!")

except Exception as e:
    print("❌", e)