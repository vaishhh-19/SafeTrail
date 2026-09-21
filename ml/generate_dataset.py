"""
Generates a realistic synthetic crime dataset for Bangalore.
Based on NCRB Karnataka crime statistics and real area coordinates.
Run: python generate_dataset.py
"""
import pandas as pd
import numpy as np
import os

np.random.seed(42)

areas = [
    ("KR_Market",        12.9625, 77.5770, 0.008, 0.85, "danger"),
    ("Majestic",         12.9767, 77.5713, 0.007, 0.90, "danger"),
    ("Shivajinagar",     12.9850, 77.6010, 0.009, 0.75, "danger"),
    ("Chickpet",         12.9680, 77.5750, 0.006, 0.80, "danger"),
    ("KR_Puram",         13.0050, 77.6680, 0.010, 0.70, "danger"),
    ("Koramangala",      12.9352, 77.6245, 0.012, 0.50, "moderate"),
    ("Jayanagar",        12.9250, 77.5938, 0.011, 0.45, "moderate"),
    ("Rajajinagar",      12.9900, 77.5530, 0.010, 0.55, "moderate"),
    ("Yeshwanthpur",     13.0280, 77.5510, 0.009, 0.48, "moderate"),
    ("Electronic_City",  12.8399, 77.6770, 0.015, 0.40, "moderate"),
    ("Hebbal",           13.0350, 77.5970, 0.012, 0.52, "moderate"),
    ("Whitefield",       12.9698, 77.7500, 0.020, 0.15, "safe"),
    ("Indiranagar",      12.9784, 77.6408, 0.013, 0.20, "safe"),
    ("HSR_Layout",       12.9116, 77.6389, 0.014, 0.18, "safe"),
    ("Marathahalli",     12.9591, 77.6972, 0.016, 0.22, "safe"),
    ("Bellandur",        12.9255, 77.6761, 0.015, 0.17, "safe"),
    ("Jyothy_Institute", 12.9165, 77.5590, 0.005, 0.10, "safe"),
    ("Bannerghatta",     12.8600, 77.5970, 0.018, 0.19, "safe"),
]

incident_types = {
    "danger":   ["theft", "assault", "robbery", "chain_snatching", "harassment"],
    "moderate": ["theft", "vandalism", "trespassing", "minor_assault"],
    "safe":     ["minor_dispute", "noise_complaint", "traffic_violation"],
}

records = []

for area in areas:
    name, clat, clon, spread, crime_rate, risk = area

    n_samples = 400 if risk == "danger" else 250 if risk == "moderate" else 150

    for _ in range(n_samples):
        lat = np.random.normal(clat, spread)
        lon = np.random.normal(clon, spread)

        if risk == "danger":
            hour_probs = [0.02]*6 + [0.01]*6 + [0.02]*4 + [0.05]*4 + [0.08]*4
            hour_probs = [p / sum(hour_probs) for p in hour_probs]
            hour = int(np.random.choice(list(range(24)), p=hour_probs))
        elif risk == "moderate":
            hour = int(np.random.choice(list(range(24))))
        else:
            hour = int(np.random.normal(12, 4)) % 24

        day_of_week  = int(np.random.randint(0, 7))
        crime_count  = int(max(0, np.random.normal(crime_rate * 100, 10)))
        incident_type = np.random.choice(incident_types[risk])

        if risk == "danger":
            feedback = round(np.random.uniform(1.0, 2.5), 2)
        elif risk == "moderate":
            feedback = round(np.random.uniform(2.5, 3.5), 2)
        else:
            feedback = round(np.random.uniform(3.5, 5.0), 2)

        records.append({
            "latitude":       round(lat, 6),
            "longitude":      round(lon, 6),
            "area_name":      name,
            "hour":           hour,
            "day_of_week":    day_of_week,
            "crime_count":    crime_count,
            "incident_type":  incident_type,
            "feedback_score": feedback,
            "risk_label":     risk,
        })

df = pd.DataFrame(records)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

os.makedirs("datasets", exist_ok=True)
path = "datasets/bangalore_crime.csv"
df.to_csv(path, index=False)

print(f"✅ Dataset created: {path}")
print(f"   Total rows: {len(df)}")
print(f"\n   Distribution:")
print(df["risk_label"].value_counts())
print(f"\n   Sample rows:")
print(df.head(5).to_string())