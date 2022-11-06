# services_demo

A Demo of the NATS Services Framework

# build

```bash
npm install
deno compile -A service-adm.ts
deno compile -A get-badge.ts
deno compile -A get-freq.ts
```

# start a bunch of services

```bash
./service-adm start generator --count 10
./service-adm start frequency --count 3
```

# discover all the services

```bash
./service-adm ping
./service-adm status
./service-adm info
```

# generate some badges and get frequency

```bash
./get-badge --name "Memo Service Tester" --company "Acme Productions"
./get-freq
```

# recheck service stats and info
