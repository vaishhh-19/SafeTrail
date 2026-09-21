import emailjs from "@emailjs/browser";

const SERVICE_ID  = "service_u32vxdy";
const TEMPLATE_ID = "template_ywn931j";
const PUBLIC_KEY  = "Tdx-RRReM8cgHGPKw";

export async function sendSOSEmail(contactEmail, contactName, userName,
                                    lat, lon, zoneName, userPhone, sosType) {
  const mapsLink = `https://maps.google.com/?q=${lat},${lon}`;
  const timeStr  = new Date().toLocaleString("en-IN");

  const templateParams = {
    to_email:   contactEmail,
    to_name:    contactName,
    user_name:  userName,
    zone_name:  zoneName || "Unknown Location",
    maps_link:  mapsLink,
    time:       timeStr,
    user_phone: userPhone || "Not provided",
    sos_type:   sosType || "other",
  };

  try {
    const result = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams,
      PUBLIC_KEY
    );
    console.log("✅ SOS Email sent:", result.status);
    return { success: true, status: result.status };
  } catch (error) {
    console.error("❌ Email failed:", error);
    return { success: false, error: error.text };
  }
}