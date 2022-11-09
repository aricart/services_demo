# services_demo

A Demo of the NATS Services Framework

Trivial demo of the NATS services framework. You can use it to generate your own
customized conference badge.

## Setup

You need [`deno`](https://deno.land/) installed to exercise the service clients.
If you want to run the services, you'll also need `npm` installed.

```bash
# On Linux or Macs:
curl -fsSL https://deno.land/install.sh | sh
# On Windows PowerShell:
irm https://deno.land/install.ps1 | iex
# Or
brew install deno

# to install npm on Mac OS:
brew install npm
# on Linux
apt-get install npm
# or via the node installer
https://nodejs.org/en/download/
```

## Overview

This repository has two services:

- [generator-service](./service.ts)
- [frequency-service](./frequency-service.ts)

## Generator Service

Connects to demo.nats.io, and listens for requests with a payload of
`{ name: string, company?: string }` and returns a shinny RethinkConn badge
customized for you.

If you installed Deno as described above, you can easily generate your own
RethinkConn badge:

```bash
# check that a service is running - if not, you will have to start one as described below.
# https://bit.ly/3hn0MbH is redirected to:
# https://raw.githubusercontent.com/aricart/services_demo/main/service-adm.ts
 deno run -A https://bit.ly/3hn0MbH ping --name badge_generator
┌───────┬───────────────────┬──────────────────────────┬─────────┬─────────────────────────────────┬──────────────────┐
│ (idx) │ name              │ id                       │ version │ description                     │ subject          │
├───────┼───────────────────┼──────────────────────────┼─────────┼─────────────────────────────────┼──────────────────┤
│     0 │ "badge_generator" │ "CNJOMPFVOE8SQO0HZ8NYDL" │ "0.0.1" │ "Generates a RethinkConn badge" │ "generate.badge" │
└───────┴───────────────────┴──────────────────────────┴─────────┴─────────────────────────────────┴──────────────────┘

# if you got a table with one or more services as shown above, you can then use the `get-badge`
# tool to get your own badge.
# https://bit.ly/3EjWiMg is redirecting to:
# https://raw.githubusercontent.com/aricart/services_demo/main/get-badge.ts
deno run -A https://bit.ly/3EjWiMg --name Demo --company "All Things NATS Are Cool"
```

## Running the services

There's a small build step required to run the service, because it depends on an
npm library called pdf-lib:

```bash
# clone the repo
git clone git@github.com:/aricart/services_demo
cd services_demo
npm install
deno run -A service-adm.ts start generator --count 2 
# in another terminall session
deno run -A service-adm.ts start frequency --count 1 &

# to see your all services running
deno run -A service-adm.ts ping
```

## Discovering and Monitoring the Services

```bash
# https://bit.ly/3hn0MbH is redirected to:
# https://raw.githubusercontent.com/aricart/services_demo/main/service-adm.ts
deno run -A http://bit.ly/3hn0MbH ping

deno run -A http://bit.ly/3hn0MbH status

# if you have watch:
watch -n 5 deno run -A http://bit.ly/3hn0MbH status
```
