# Mockingbird Bookings

Band portal for The Mockingbird Theater: date requests, click-to-sign agreement, advance, and promo uploads. Data lives in the Airtable base "Mockingbird Bookings".

Secret required in Cloudflare (Settings > Variables and Secrets): `AIRTABLE_TOKEN`, a personal access token with `data.records:read` and `data.records:write` on the Mockingbird Bookings base.

When the agreement text changes, bump `AGREEMENT_VERSION` in both `src/worker.js` and `public/index.html`.
