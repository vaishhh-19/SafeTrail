# SafeTrail — Changes Made

## Round 2 (this update)

1. **Unlimited emergency contacts** — removed the hard cap of 4 in
   `frontend/src/pages/Profile.jsx` (the "Add Contact" button, the
   `x/4` counters, and the client-side `contacts.length >= 4` check
   are gone). The backend never had a cap, so no API change needed.

2. **More precise areas — both geofence zones and GPS tracking:**
   - `backend/seed_zones.py` — all default zone radii roughly halved
     (e.g. 800m → 400m) so zones map to the actual risky spot instead
     of blanketing a whole neighborhood.
   - `backend/models/geofence_model.py` — default radius for new
     zones dropped from 200m → 100m.
   - `backend/routes/geofence_routes.py` — new zones now validate
     radius (must be > 0, capped at 1500m) so an admin can't
     accidentally create one giant imprecise zone.
   - `frontend/src/hooks/useGPS.js` — `getCurrentPosition` now forces
     a fresh (non-cached) fix, `watchPosition`'s `maximumAge` dropped
     from 5000ms → 2000ms for more frequent refreshes, and a new
     "keep the best fix" filter avoids replacing a precise recent
     reading with a noisier one unless it's gone stale (>8s old).
   - `frontend/src/hooks/useGeofence.js` — the "GPS too imprecise to
     trust" cutoff tightened from 150m → 80m, since zones themselves
     are now smaller.

3. **SMS to emergency contacts after SOS** — already implemented
   (`backend/utils/sms_service.py` + `alert_routes.py` `/api/alert/sos`
   route send SMS via Fast2SMS to every contact, alongside email). No
   changes needed here.

4. **Admin panel for managing all users** — already implemented
   (`AdminDashboard.jsx` "Users" tab + `/api/admin/users`,
   `/api/admin/users/<id>/activate|deactivate`), alongside Overview,
   Live Alerts, and Feedback tabs. No changes needed here.

5. **Cloud-connected auto-retraining on every feedback approval:**
   - `backend/routes/admin_routes.py` — approving a feedback report
     (`PUT /api/admin/feedback/<id>/approve`) now kicks off a full
     retrain automatically in a background thread (with a lock so
     overlapping approvals don't trigger duplicate retrains). The
     manual "Retrain Now" button still works if you want to force one.
   - `ml/cloud_sync.py` (new) — after every retrain, uploads the model
     files to S3-compatible cloud storage (AWS S3, Cloudflare R2,
     Backblaze B2, MinIO, GCS via S3 interop) if `CLOUD_STORAGE_BUCKET`
     is set. Uploads both a `latest/` copy and a timestamped
     `versions/<ts>/` copy. If the bucket isn't configured, this is a
     clean no-op — retraining still works fully offline.
   - `ml/retrain_from_feedback.py` — now calls the cloud sync step and
     includes its result in the returned report.
   - `backend/.env.example` — documents the new
     `CLOUD_STORAGE_BUCKET`, `CLOUD_STORAGE_PREFIX`,
     `CLOUD_STORAGE_REGION`, `CLOUD_STORAGE_ENDPOINT_URL`,
     `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` variables.
   - `backend/requirements.txt` — added `boto3` (only imported/needed
     if cloud sync is actually turned on).
   - `AdminDashboard.jsx` — updated the retrain panel copy to explain
     it now runs automatically, renamed the button to "Force Retrain
     Now", and added a cloud-sync status line to the report.

### To actually use cloud sync
Set these in `backend/.env` (get bucket + keys from your cloud
provider's console):
```
CLOUD_STORAGE_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
# only needed for non-AWS providers:
CLOUD_STORAGE_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
```
Then `pip install -r requirements.txt` to pull in `boto3`. Leave
`CLOUD_STORAGE_BUCKET` empty and everything still works locally only.

---


## 1. Zones not visible — fixed
Root cause: `backend/seed_zones.py` existed but was never run, so the `geofences`
collection was empty. Fixed two ways:
- `backend/seed_data.py` now auto-seeds the 11 default zones (+ the new
  authority directory) on every app startup **if the DB is empty**. No manual
  step needed anymore.
- You can still run `python backend/seed_zones.py` by hand if you want to
  reset/reseed zones at any point.

## 2. Light, colorful UI/UX
- `frontend/tailwind.config.js` — new palette (brand blue/violet gradient,
  kept your safe/moderate/danger semantic colors, added soft shadows).
- `frontend/src/index.css` — light gradient background, white "glass" cards,
  new pulse/toast/bell animations.
- Every page and component converted from the dark theme to light
  (systematic, not per-page guesswork — verified no leftover dark classes).

## 3. Admin role + real-time notifications
- Admin login already existed (`role: "admin"` on the user doc, set via
  `backend/make_admin.py`) — kept as-is.
- New: `GET /api/admin/notifications` (unseen alerts + count),
  `PUT /api/admin/notifications/<id>/seen`, `PUT /api/admin/notifications/mark-all-seen`.
- `AdminDashboard.jsx` now polls every 5s, shows a shaking bell with unread
  badge, a dropdown list, and a toast popup the moment a new SOS/danger alert
  lands — no page refresh needed.

## 4. SOS classification
- New SOS types: **Medical, Fire, Crime, Harassment, Accident, Other**
  (`frontend/src/components/ui/SOSTypePicker.jsx`).
- Stored on the alert (`sos_type` field) and shown throughout the admin
  dashboard, SMS text, and email subject/body.
- **Floating SOS button on every page** — `FloatingSOSButton.jsx`, mounted
  once in `MainLayout.jsx`. Pulses in the bottom-right corner, opens a quick
  type-picker + one-tap send, uses the same `triggerSOS()` pipeline as the
  full SOS page.

## 5. Police / local-authority notification
- New `backend/models/authority_model.py` — a seeded directory of nearby
  police stations, fire stations, and hospitals/ambulance control rooms.
  On SOS, it picks the nearest relevant station(s) for that SOS type and
  logs a "notified" record (with name, phone, distance).
- **This part is simulated** — there's no public dispatch API a student
  project can legally call, so nothing is actually sent to a real station.
  This is shown to both the user (on the SOS success screen) and the admin
  (Authority Notification Log on the Alerts tab).
- **Real** SMS + email to the user's own emergency contacts is unchanged
  and still fires for real via Fast2SMS / Gmail SMTP / EmailJS.

## 6. Feedback → model retraining
- `ml/retrain_from_feedback.py` — pulls admin-approved feedback, converts
  ratings into labeled training rows, merges with the original crime
  dataset, retrains Random Forest + Isolation Forest, backs up the previous
  model files (`ml/models/backups/<timestamp>/`), and hot-reloads the live
  predictor — no server restart needed.
- Trigger: `POST /api/admin/retrain`, wired to a "Retrain Now" button on the
  admin Overview tab, showing samples used / accuracy / backup confirmation.

## Before you run it
- `backend/venv/` and `frontend/node_modules/` were **not** included in this
  zip (huge, and OS-specific for venv). Recreate them:
  ```
  cd backend && python -m venv venv && venv\Scripts\activate  (or source venv/bin/activate)
  pip install -r requirements.txt
  cd ../frontend && npm install
  ```
- Make sure MongoDB is running locally (`mongodb://localhost:27017`) before
  starting the backend — zones/authorities auto-seed on first boot.
- To get an admin account: register normally, then edit
  `backend/make_admin.py` with your email and run it once, then log out/in.

## SafeTrail V2 UI + Multi-Contact Fix
- Added a visibly different colourful V2 visual layer for registration, profile, SOS, cards, buttons, and contact sections.
- Registration now visibly supports a dynamic emergency-contact list and sends the full list in the registration payload.
- Registration contacts are mirrored into the emergency_contacts collection for compatibility with Profile/legacy flows.
- Duplicate emergency-contact phone numbers are rejected when adding contacts from Profile.
- SOS page now displays every configured emergency contact instead of only the first one.
- Backend SOS already iterates through all deduplicated contacts for SMS/email notification.


## Area intelligence update — 2026-08-28

- Added automatic named-area profiles learned from the training split.
- Added nearest-area matching for live GPS predictions.
- Added area-specific danger rate, sample count, night/evening incidents and centroids.
- Added area-calibrated model probabilities with smoothing so sparse areas do not dominate predictions.
- Added per-area precision, recall and F1 metrics to the Admin Dashboard.
- Added an Area Intelligence tab to the Admin Dashboard.
- Kept the global model + road-segment model architecture; area and road evidence are combined at inference time.
- Added `ml/area_profiles.json` and retrained the bundled ML models.
