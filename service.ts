import {
  addService,
  connect,
  JSONCodec,
  ServiceError,
} from "https://raw.githubusercontent.com/nats-io/nats.deno/dev/src/mod.ts";
import { generateBadge } from "./generator.ts";

type Badge = {
  name: string;
  company?: string;
};

const jc = JSONCodec<Badge>();
const nc = await connect({ servers: "demo.nats.io" });

const service = await addService(nc, {
  name: "badge_generator",
  version: "0.0.1",
  description: "Generates a RethinkConn badge",
  schema: {
    request: "{ name: string, company?: string }",
    response: "Uint8Array",
  },
  endpoint: {
    subject: "generate.badge",
    handler: (err, msg): Promise<void> => {
      if (err) {
        console.log(
          `${service.name} received a subscription error: ${err.message}`,
        );
        return Promise.reject(err);
      }
      const req = jc.decode(msg.data);
      if (typeof req.name !== "string" || req.name.length === 0) {
        console.log(`${service.name} is rejecting a request without a name`);
        return Promise.reject(new ServiceError(400, "name is required"));
      }
      return generateBadge(req)
        .then((d) => {
          msg.respond(d);
          return Promise.resolve();
        })
        .catch((err) => {
          return Promise.reject(err);
        });
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
