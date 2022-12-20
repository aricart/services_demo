import {
  connect,
  JSONCodec,
} from "https://raw.githubusercontent.com/nats-io/nats.deno/main/src/mod.ts";

type Badge = {
  name: string;
  company?: string;
};

const jc = JSONCodec();
const nc = await connect({ servers: "demo.nats.io" });

const r: Record<string, number> = {};

const sub = nc.subscribe("generate.badge");
(async () => {
  for await (const m of sub) {
    const badge = jc.decode(m.data) as Badge;
    const name = badge.name ?? "";
    if (name === "") {
      return;
    }
    const names = name.split(" ");
    const n = names[0].toLowerCase();
    r[n] = (r[n] || 0) + 1;
  }
})().catch();

const service = await nc.services.add({
  name: "frequency_service",
  version: "0.0.1",
  description: "monitors names",
  endpoint: {
    subject: "badge.freq",
    handler: (err, msg) => {
      if (err) {
        // stop will stop the service, and close it with the specified error
        service.stop(err).then();
        return;
      }
      msg.respond(jc.encode(r));
    },
  },
});

const si = service.info();

service.stopped.then((err: Error | null) => {
  if (err) {
    console.log(`${si.name} stopped with error: ${err.message}`);
  } else {
    console.log(`${si.name} stopped.`);
  }
});

console.log(
  `${si.name} ${si.version} started with ID: ${si.id}`,
);
