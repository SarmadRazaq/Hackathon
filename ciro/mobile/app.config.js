// Extends app.json and injects runtime env vars so secrets stay out of source control.
// Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in your .env (local) or EAS secrets (CI/prod).
const base = require("./app.json");

module.exports = {
  ...base.expo,
  android: {
    ...base.expo.android,
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      },
    },
  },
};
