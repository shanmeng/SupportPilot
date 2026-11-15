---
doc_id: KB-FIX-002
title: Troubleshooting a Missing Webhook Notification
doc_type: troubleshooting
authority: operational_guidance
product_areas: [webhooks, payments]
api_versions: all_supported
effective_from: "2025-10-01"
effective_to: null
supersedes: []
rule_ids: []
related_docs: [KB-FIX-001]
indexing: include
language: en
---

# Troubleshooting a Missing Webhook Notification

## Check the scope first

Confirm the account ID and the environment (production or sandbox). Sandbox events are never delivered to production endpoints.

## Inspect the delivery records

Look up the event for the payment, then list its webhook deliveries. A delivery with status `failed` and response code 410 means the endpoint was disabled.

## Escalate

If no event exists for the payment, the payment may not have changed state yet. Do not claim a delivery failed without a matching delivery record.
