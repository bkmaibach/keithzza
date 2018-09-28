#!/bin/bash
fuser -k 3000/tcp
fuser -k 3001/tcp
NODE_ENV=staging NODE_DEBUG=handlers node ./index.js