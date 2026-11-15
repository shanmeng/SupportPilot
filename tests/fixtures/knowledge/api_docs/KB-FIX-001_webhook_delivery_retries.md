---
doc_id: KB-FIX-001
title: Webhook Delivery Retries
doc_type: api_doc
authority: official
product_areas: [webhooks]
api_versions: all_supported
effective_from: "2025-10-01"
effective_to: null
supersedes: []
rule_ids: [RULE-FIX-WEBHOOK-001]
related_docs: [KB-FIX-002]
indexing: include
language: en
---

# Webhook Delivery Retries

## Delivery attempts

Each event is delivered to every enabled webhook endpoint in the same account and environment. A delivery succeeds when the endpoint responds with an HTTP 2xx status within 10 seconds.

## Retry schedule

Failed deliveries are retried with exponential backoff for up to 72 hours. Each retry is a new delivery attempt with its own attempt number. Retries stop as soon as one attempt succeeds.

## Gone endpoints

If an endpoint responds with HTTP 410 Gone, retries for that delivery stop immediately and the endpoint is disabled. Re-enable the endpoint after fixing the receiver.
