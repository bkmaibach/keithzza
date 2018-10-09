#!/bin/bash
NODE_ENV=staging
NODE_DEBUG=handlers

STRIPE_API_KEY_SECRET=sk_test_8ZIId4nb1aGPYN7fvtydf6VL
MAILGUN_PUBLIC_VALIDATION_KEY=pubkey-5d4ec98faffc4c5ae6e678184b65744e
MAILGUN_PRIVATE_API_KEY=key-823721ae48f6e768d9ca22d04c5d2b5a

fuser -k 3000/tcp
fuser -k 3001/tcp
node ./index.js