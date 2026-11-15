---
doc_id: KB-FIX-003
title: Tenant Isolation Rules
doc_type: business_rule
authority: official
product_areas: [platform, accounts]
api_versions: all_supported
effective_from: "2025-10-01"
effective_to: null
supersedes: []
rule_ids: [RULE-FIX-TENANT-001, RULE-FIX-TENANT-002]
related_docs: []
indexing: include
language: en
---

# Tenant Isolation Rules

## Ownership

Every customer, payment and refund belongs to exactly one merchant account and one environment. Support staff may only read records inside the account they are investigating.

## Cross-account requests

A request that names a record from another account is rejected with error code FP-ACCESS-403. Never substitute data from a different account.
