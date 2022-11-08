# services_demo

A Demo of the NATS Services Framework

Trivial demo of the NATS services framework. You can use it to generate your own
customized conference badge.

You need [`deno`](https://deno.land/) installed to exercise the services and the
demo cli. To run the services you'll need `deno` and `npm`:

```bash
# On Linux or Macs:
curl -fsSL https://deno.land/install.sh | sh
# On Windows PowerShell:
irm https://deno.land/install.ps1 | iex
# Or
brew install deno
```

Optional: If running services locally:

```bash
# clone the repo
git clone git@github.com:/aricart/services_demo
cd services_demo
npm install
deno run -A service-adm.ts start generator --count 2
deno run -A service-adm.ts start frequency --count 1
```

If you want to generate your badge:

```bash
# Check at least one generator service is running. If you cloned the repo:
deno run -A service-adm.ts ping -n badge_generator
# otherwise, simply run it from its URL:
deno run -A https://raw.githubusercontent.com/aricart/services_demo/main/service-adm.ts ping -n badge_generator
┌───────┬───────────────────┬──────────────────────────┬─────────┬─────────────────────────────────┬──────────────────┐
│ (idx) │ name              │ id                       │ version │ description                     │ subject          │
├───────┼───────────────────┼──────────────────────────┼─────────┼─────────────────────────────────┼──────────────────┤
│     0 │ "badge_generator" │ "URDPJE2ZYOZ6JWNYZRDVSB" │ "0.0.1" │ "Generates a RethinkConn badge" │ "generate.badge" │
...
└───────┴───────────────────┴──────────────────────────┴─────────┴─────────────────────────────────┴──────────────────┘

deno run -A https://raw.githubusercontent.com/aricart/services_demo/main/get-badge.ts --name "My Name" --company "My Company"
```

# reget the status to see stats updating

```bash
deno run -A https://raw.githubusercontent.com/aricart/services_demo/main/service-adm.ts ping
deno run -A https://raw.githubusercontent.com/aricart/services_demo/main/service-adm.ts status
deno run -A https://raw.githubusercontent.com/aricart/services_demo/main/service-adm.ts info

deno run -A https://raw.githubusercontent.com/aricart/services_demo/main/get-freq.ts
```
