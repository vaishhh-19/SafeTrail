import API from "./api";
import { sendSOSEmail } from "./emailService";

/**
 * Trigger an SOS: logs it on the backend (creates an alert + attempts
 * SMS), then emails every emergency contact directly from the browser.
 *
 * This is the single source of truth for "what happens when SOS fires" —
 * both the SOS page's big red button and the danger-zone auto-alert popup
 * call this, so neither one can silently skip the email step.
 *
 * @returns {{ ok: boolean, sosResult: object|null, emailResults: Array, error?: string }}
 */
export async function triggerSOS({ user, latitude, longitude, zoneName, sosType = "other", auto = false }) {
  try {
    const res = await API.post("/api/alert/sos", {
      latitude,
      longitude,
      zone_name: zoneName || "SOS triggered",
      sos_type: sosType,
      auto,
    });

    // The backend already merges contacts from both the registration
    // record and the emergency_contacts collection (deduplicated), and
    // includes each contact's email — so we don't re-fetch/re-merge here.
    const contacts = res.data.contacts || [];

    const emailResults = [];
    for (const contact of contacts) {
      if (contact.email) {
        try {
          const emailRes = await sendSOSEmail(
            contact.email,
            contact.name,
            user?.name,
            latitude,
            longitude,
            zoneName || "SOS triggered",
            user?.phone,
            sosType
          );
          emailResults.push({
            name: contact.name, email: contact.email, phone: contact.phone,
            success: !!emailRes.success, method: "email",
          });
        } catch (emailErr) {
          console.error(`SOS email failed for ${contact.name}:`, emailErr);
          emailResults.push({
            name: contact.name, email: contact.email, phone: contact.phone,
            success: false, method: "email",
          });
        }
      } else {
        emailResults.push({
          name: contact.name, phone: contact.phone,
          success: false, method: "no-email",
        });
      }
    }

    return { ok: true, sosResult: res.data, emailResults };
  } catch (error) {
    console.error("SOS trigger failed:", error);
    return {
      ok: false, sosResult: null, emailResults: [],
      error: error.response?.data?.error || "SOS failed. Please call 100 directly.",
    };
  }
}
