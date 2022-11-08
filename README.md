# services_demo

A Demo of the NATS Services Framework

You need deno installed:

```bash
# On Linux or Macs:
curl -fsSL https://deno.land/install.sh | sh
# On Windows PowerShell:
irm https://deno.land/install.ps1 | iex
```

If you want to run the services locally:

```bash
cd <this directory>
npm install
deno run -A service-adm.ts start generator --count 2
deno run -A service-adm.ts start frequency --count 1
```

If you want to get a badge:

```bash
# Check at least one generator service is running:
deno run -A service-adm.ts ping -n badge_generator
# or:
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
deno run -A service-adm.ts ping
deno run -A service-adm.ts status
deno run -A service-adm.ts info

deno run -A https://raw.githubusercontent.com/aricart/services_demo/main/get-freq.ts
```
