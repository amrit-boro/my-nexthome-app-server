const express = require("express");
const router = express.Router();
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
// Make sure GEMINI_API_KEY is in your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

router.post("/generate-description", async (req, res) => {
  console.log("Received Body:", req.body);

  try {
    // 1. Check API Key
    if (!process.env.GEMINI_API_KEY) {
      console.error("ERROR: GEMINI_API_KEY is missing in .env file");
      return res
        .status(500)
        .json({ error: "Server configuration error: API Key missing" });
    }

    // 2. Safe Input Extraction (Prevents crashes)
    const { propertyType, location, gender } = req.body;

    // CRITICAL FIX: Default to empty array if amenities is undefined
    const amenities = Array.isArray(req.body.amenities)
      ? req.body.amenities
      : [];

    // 3. Validate required fields
    if (!propertyType || !location) {
      return res
        .status(400)
        .json({ error: "Property type and location are required" });
    }

    // 4. Construct Prompt
    const prompt = `
        Act as a professional real estate copywriter.
        Write a catchy, inviting, and SEO-friendly description for a Paying Guest (PG) accommodation.

        Details:
        - Type: ${propertyType} (PG/Hostel)
        - Location: ${location}
        - Target Tenant: ${gender || "Any"}
        - Amenities Included: ${amenities.join(", ")}

        Instructions:
        - Tone: Warm, secure, and convenient.
        - Structure: Start with a catchy headline, then a descriptive paragraph.
        - Length: Keep it under 150 words.
        - Output: Plain text only, no markdown formatting (* or #).
      `;

    // 5. Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-pro-latest" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("AI Generated:", text.substring(0, 50) + "..."); // Debug log

    // 6. Send response
    res.json({ description: text });
  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({
      error: "Failed to generate description.",
      details: error.message,
    });
  }
});

module.exports = router;
