# @vitrion/n8n-nodes-zentria

Community node for [Zentria](https://app.zentria.nl). It starts workflows from **signed team webhooks** and writes back through the **public team API**.

n8n Cloud only runs **verified** community nodes. Until this package is verified, install it on **self-hosted n8n**.

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

The credential test calls `GET /api/public/me`. That response includes the bound team and `modules` (`sales_cms`, `crm_leads`, `speed_to_lead`, `todos`). Sales locators stay empty when Sales is off.

## Zentria Trigger

On activate, the node registers an HTTPS webhook on the PAT team (`POST /api/public/webhooks`, `source: n8n`). On deactivate it deletes that endpoint. Duplicate activate with the same URL + events reuses the existing endpoint.

Incoming deliveries are checked with **Standard Webhooks** (`webhook-id`, `webhook-timestamp`, `webhook-signature`) using the secret returned at create time. No npm signing library — HMAC is inline.

n8n Cloud and local test URLs differ. Activate the workflow in the environment that should receive events.

## Zentria Action

Resource + operation against `/api/public`. Foreign keys use searchable locators (`q`) so you pick “Discovery call”, not a numeric id.

Minimum operations: deals (get/list/create/update/**move stage**), people/orgs, forms/submissions, pipeline, activities (create/complete), CRM leads (approve/reject), customers, members, todos, Speed to Lead flows, webhooks.

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
