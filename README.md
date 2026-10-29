# @vitrion/n8n-nodes-zentria

Community node for [Zentria](https://app.zentria.nl). It starts workflows from **signed team webhooks** and writes back through the **public team API**.

n8n Cloud only runs **verified** community nodes. Until this package is verified, install it on **self-hosted n8n**.

## Release (npm)

Publish **from this repo** (`vitrionbv/n8n-nodes-zentria`), not from ZentriaApp.

1. Bump `package.json` `version`, commit to `main`.
2. Tag `X.Y.Z` (example: `0.1.7`) and push that tag.
3. GitHub Action `Publish` (`.github/workflows/publish.yml`) runs `npm run release` with OIDC provenance.

Do not add a publish workflow to ZentriaApp. Do not tag `n8n-nodes-v*` on the parent app. Do not `npm publish` from a laptop.

## Install (self-hosted)

```bash
npm install @vitrion/n8n-nodes-zentria
```

Or in n8n: Settings → Community nodes → Install `@vitrion/n8n-nodes-zentria`.

Requires a Zentria team **API key** (Teams → API keys) with the scopes you need (`webhooks:write` for the Trigger, plus `sales:*` / `crm:*` / … for actions).

## Credentials

| Field | Meaning |
| --- | --- |
| Base URL | Zentria origin, e.g. `https://app.zentria.nl` |
| API Key | Team Personal Access Token |

The credential test calls `GET /api/public/me`. That response includes the bound team and `modules` (`sales_cms`, `crm_leads`, `speed_to_lead`, `todos`, `business_profiles`). Sales locators stay empty when Sales is off.

## Zentria Trigger

On activate, the node registers an HTTPS webhook on the PAT team (`POST /api/public/webhooks`, `source: n8n`). On deactivate it deletes that endpoint. Duplicate activate with the same URL + events reuses the existing endpoint.

The picker includes sales, CRM (including `crm.campaign.month_closed`), customer, sales notes and activities, todo, **9 Business Profile events** (`business_profile.review.*`, `business_profile.review_reply.*`, `business_profile.location_change.*`, `business_profile.post.*`, `business_profile.account.needs_reauth`), customer events (`customer.created`, `customer.updated`, `customer.archived`, `customer.restored`), campaign events (`campaign.archived`, `campaign.restored`), **13 invoice events** (`invoice.created` through `invoice.cancelled`, plus `invoice.reminder.*`), **7 CommuniQate WhatsApp events** (`communiqate.message.received`, `communiqate.message.sent`, `communiqate.message.status_updated`, `communiqate.template.*`) for teams that connected CommuniQate, and **2 mail events** (`mail.sent`, `mail.failed`, with `data.message` holding the mail without bodies and your `metadata`).

Incoming deliveries are checked with **Standard Webhooks** (`webhook-id`, `webhook-timestamp`, `webhook-signature`) using the secret returned at create time. No npm signing library — HMAC is inline.

n8n Cloud and local test URLs differ. Activate the workflow in the environment that should receive events.

## Zentria Action

Resource + operation against `/api/public`. Foreign keys use searchable locators (`q`) so you pick “Discovery call”, not a numeric id.

Minimum operations: deals (get/list/create/update/**move stage**), people/orgs, forms/submissions, pipeline, activities (create/complete), CRM leads (get, list with filters on review status, date, customer, campaign, source, lead value category and invoiced, approve, reject; each lead carries its lead value in euro cents with category label, billing period and invoice), CRM lead value categories (read only: the tariff per category and the default for other), CRM calls (read only Voys calls: list with filters on date, customer, campaign, lead, outcome, direction, answered and phone, or get one call with transcript, summary and linked lead; scope `crm:read`), customers (including archive, restore and a status filter), members, todos, Speed to Lead flows (including creating flows for several Elementor connections or a whole campaign in one step), webhooks, and Business Profile (list locations, reviews, review replies, changes and posts; approve or reject a reply; dismiss a review without replying (for reviews Google refuses replies to) or restore it, and filter reviews on dismissed; accept (Google is right), dismiss or reject a change; filter locations on category, each location includes its standard profile; create or delete a post; read-only results of a location: performance and search keywords). Business Profile needs the `business-profiles:read` scope, and `business-profiles:write` for the approve, reject, accept, dismiss, restore, create and delete operations.

The operations in `nodes/Zentria/areas/` are described as data and turned into n8n parameters by `areas/engine.ts`, so a new API endpoint is a few lines there. They cover what the app does, limited by the rights of the member behind the key and the scopes of the key: CRM leads (filters, set lead value, approve or reject with a reason, delete), submissions, callbacks, lead value categories and settings, the CRM dashboard and customer report, campaigns and their Elementor, mailbox and Voys connections, invoices and their actions, customers (delete, labels, merging on KvK, portal users, Mollie mandate), Sales administration (deletes, pipelines, stages, forms, settings), Business Profiles administration (accounts, locations, reply profiles, schedules, photos), team settings, invitations and exports, and **CommuniQate** (WhatsApp through the team's CommuniQate workspace: channels, templates incl. creating and submitting them to Meta, contacts and fields, conversations, messages, sending text, templates and media, file upload; scopes `communiqate:read`, `communiqate:write`, `communiqate-admin:write`, only when the team connected CommuniQate in Zentria), and **Mail** (send a real email from the team's own address through its SMTP account, or through Zentria (`zentria@updates.vitrion.nl`) when the team has no account; pick an account or the default account, To, CC and BCC as comma separated addresses with at most 50 recipients in total, Reply-To, From Name, Subject, HTML and/or Text, metadata that comes back in the `mail.*` webhooks, and an optional Idempotency Key so a retry never sends twice; no attachments; list and get mail accounts, list sent mails with filters on status, account and source, get one mail with status and error; scopes `mail:read` and `mail:write`). Operations that delete data or move money do exactly what the app does: give such workflows a key with the fewest scopes that works.

## Loop risk

Zentria **always** emits webhooks for PAT/API writes. A workflow that updates a deal on `sales.deal.updated` can loop. Filter on payload fields or avoid writing the same record you just received.

## HTTP fallback

If you cannot install this node (n8n Cloud before verification, or a trial without community nodes):

1. In Zentria, Teams → Webhooks → add the URL of an n8n **Webhook** node.
2. In n8n, call Zentria with **HTTP Request** + the same PAT (`Authorization: Bearer …`).
3. Verify signatures yourself with Standard Webhooks (`id.timestamp.body`, `v1,<base64>`).

## Local QA

1. Mint a PAT on a team with Sales + Webhooks.
2. `npm run build` in this folder, point a local n8n at `dist/`.
3. Add the credential, activate a Trigger on `sales.form.submitted`.
4. Submit a Zentria form. The Trigger should fire with `data.deal` and `data.submission`.
5. Add a Zentria Action → Deal → Move Stage. Confirm the board updates and a new `sales.deal.stage_changed` event arrives.
6. Deactivate the workflow. The Zentria webhook endpoint should disappear.

## License

MIT
