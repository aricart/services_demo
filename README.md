# services_demo

A Demo of the NATS Services Framework

# build

```bash
npm install
deno compile -A service.ts
deno compile -A frequency-service.ts
deno compile -A service-adm.ts
deno compile -A get-badge.ts
deno compile -A get-freq.ts
```


# start a bunch of services

```bash
./service &
./service &
```

# start a frequence service
```bash
./frequency-service &
```

# discover all the services

```bash
./service-adm ping
```

# generate some badges and get frequencyh

```bash
./get-badge --name "Memo Service Tester" --company "Acme Productions"
./get-freq
```

# recheck service stats and info


