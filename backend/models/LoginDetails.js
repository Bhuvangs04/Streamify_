const mongoose = require("mongoose");

const loginDetailSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to User
  username: { type: String, required: true }, // Username of the user
  loginTime: { type: Date, default: Date.now }, // Timestamp of when login occurred
  status: { type: String, enum: ["success", "failure"], required: true }, // Login status (success/failure)
  ip: { type: String, required: true }, // IP address of the user
  network: { type: String, required: true }, // Network address
  version: { type: String, required: true }, // IP version (IPv4/IPv6)
  city: { type: String, required: true }, // City of the user
  region: { type: String, required: true }, // Region/State
  regionCode: { type: String, required: true }, // Region code
  country: { type: String, required: true }, // Country
  countryName: { type: String, required: true }, // Country name
  countryCode: { type: String, required: true }, // Country code
  countryCodeIso3: { type: String, required: true }, // Country ISO3 code
  countryCapital: { type: String, required: true }, // Capital of the country
  countryTld: { type: String, required: true }, // Country TLD
  continentCode: { type: String, required: true }, // Continent code
  inEu: { type: Boolean, required: true }, // Is in EU
  postal: { type: String, }, // Postal code
  latitude: { type: Number, required: true }, // Latitude of the user
  longitude: { type: Number, required: true }, // Longitude of the user
  timezone: { type: String, required: true }, // Timezone
  utcOffset: { type: String, required: true }, // UTC offset
  countryCallingCode: { type: String, required: true }, // Country calling code
  currency: { type: String, required: true }, // Currency used
  currencyName: { type: String, required: true }, // Currency name
  languages: { type: String, required: true }, // Languages spoken
  countryArea: { type: Number, required: true }, // Country area in sq km
  countryPopulation: { type: Number, required: true }, // Population of the country
  asn: { type: String, required: true }, // ASN (Autonomous System Number)
  org: { type: String, required: true }, // Organization
});

const LoginDetail = mongoose.model("LoginDetail", loginDetailSchema);

module.exports = LoginDetail;
