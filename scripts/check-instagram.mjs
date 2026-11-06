// Self-check for the contact form's Instagram field: node --experimental-strip-types scripts/check-instagram.mjs
import assert from "node:assert/strict";
import { normalizeInstagram as n } from "../src/lib/instagram.ts";

const URL = "https://www.instagram.com/webix_dev/";
for (const ok of ["@webix_dev", "  @webix_dev ", "instagram.com/webix_dev", "www.instagram.com/webix_dev/", "https://instagram.com/webix_dev", "https://www.instagram.com/webix_dev/?hl=en", "HTTPS://INSTAGRAM.COM/webix_dev"]) assert.equal(n(ok), URL, ok);
for (const bad of ["", "webix_dev", "@", "@has space", "facebook.com/webix", "instagram.com/", "instagram.com/p/abc123", "notinstagram.com/webix", "javascript:alert(1)"]) assert.equal(n(bad), null, bad);
console.log("instagram: ok");
