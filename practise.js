// This script bypasses the SDK to test your API Key directly.
// Run: node debug_gemini.js

const https = require("https");

// 1. PASTE YOUR NEW API KEY HERE
const API_KEY = "AIzaSyBNu89f19ZWCpj1Agkr_b7Zr22RsYwBEQM";

const getModels = () => {
  console.log("1. Testing Connectivity & Listing Available Models...");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

  https
    .get(url, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const json = JSON.parse(data);

          if (json.error) {
            console.error("\n❌ API KEY ERROR:");
            console.error(`Code: ${json.error.code}`);
            console.error(`Message: ${json.error.message}`);
            console.error(
              "\nFIX: Your API key is invalid or the project is missing permissions."
            );
          } else if (json.models) {
            console.log("\n✅ SUCCESS! Your API Key works.");
            console.log("These are the EXACT model names you can use:");

            // Filter and print only Gemini models
            const geminiModels = json.models
              .filter((m) => m.name.includes("gemini"))
              .map((m) => m.name.replace("models/", "")); // Clean up the name

            console.log(geminiModels);

            console.log(
              "\nUpdate your aiRoutes.js to use one of these names exactly."
            );
          } else {
            console.log("Unknown response:", json);
          }
        } catch (e) {
          console.error("Error parsing JSON:", e);
        }
      });
    })
    .on("error", (err) => {
      console.error("Network Error:", err.message);
    });
};

getModels();
