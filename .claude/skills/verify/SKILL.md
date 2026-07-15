# Verify

Use this for runtime verification of the Next.js app in this package.

1. Check for a running dev server first. This project normally uses `npm run dev` (`next dev -p 3001`), but port 3001 may already be occupied by an existing Next process.
2. If the server is already up, drive `http://localhost:3001`. If not, start `npm run dev` from `vibeHR/`.
3. For organization UI changes, verify through rendered app pages:
   - New organization form: `/organizations/new`
   - Organization list with a selected org: `/organizations?orgId=1&asOf=<today>`
   - Detail view: `/organizations/1`
   - Correct version form: `/organizations/1?mode=edit`
   - Add version form: `/organizations/1?mode=add`
4. Capture rendered HTML or browser screenshots from those routes. For select-option changes, parse the rendered `<select name="orgType">` options and also search the rendered output for removed labels.

Gotchas:
- This app can have an existing dev server lock in `.next/dev`; starting a second dev server on a different port may print `Ready` and then exit with `Another next dev server is already running`. Use the existing port shown in the message.
- Existing seed data may still contain historical option labels, so distinguish stored table/detail values from selectable `<option>` labels.
