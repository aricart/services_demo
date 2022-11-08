import {
  addService,
  connect,
  JSONCodec,
} from "https://raw.githubusercontent.com/nats-io/nats.deno/dev/src/mod.ts";

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

const service = await addService(nc, {
  name: "frequency_service",
  version: "0.0.1",
  description: "monitors names",
  endpoint: {
    subject: "badge.freq",
    handler: (err, msg): Promise<void> => {
      if (err) {
        return Promise.reject(err);
      }
      msg.respond(jc.encode(r));
      return Promise.resolve();
    },
  },
});

service.done.then((err: Error | null) => {
  if (err) {
    console.log(`${service.name} stopped with error: ${err.message}`);
  } else {
    console.log(`${service.name} stopped.`);
  }
});

console.log(
  `${service.name} ${service.version} started with ID: ${service.id}`,
);
