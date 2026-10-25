// Extends app.json. google-services.json (Firebase, for Android push) is kept
// out of git, so EAS Build can't see the local copy. On EAS it comes from the
// secret file variable GOOGLE_SERVICES_JSON (expo.dev → project → Environment
// variables); locally it falls back to ./google-services.json.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
