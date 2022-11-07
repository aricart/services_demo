import {
  addService,
  connect,
  headers,
  JSONCodec,
  ServiceError,
  ServiceErrorHeader,
} from "https://raw.githubusercontent.com/nats-io/nats.deno/dev/src/mod.ts";
import { generateBadge } from "./generator.ts";
import { Empty } from "https://raw.githubusercontent.com/nats-io/nats.deno/main/nats-base-client/mod.ts";

type Badge = {
  name: string;
  company?: string;
};

const jc = JSONCodec<Badge>();
const nc = await connect({ servers: "demo.nats.io" });

let generatedBadges = 0;
let errors = 0;
let lastError: Error | null = null;

const service = await addService(nc, {
  name: "badge_generator",
  version: "0.0.1",
  description: "Generates a RethinkConn badge",
  statusHandler: (_endpoint) => {
    return Promise.resolve({
      generatedBadges,
      errors,
      lastError: lastError,
    });
  },
  endpoint: {
    subject: "generate.badge",
    handler: (err, msg): Error | void => {
      if (err) {
        errors++;
        lastError = err;
        console.log(
          `${service.name} received a subscription error: ${err.message}`,
        );
        return err;
      }
      const req = jc.decode(msg.data);
      if (typeof req.name !== "string" || req.name.length === 0) {
        console.log(`${service.name} is rejecting a request without a name`);
        return new ServiceError(400, "name is required");
      }
      generateBadge(req)
        .then((d) => {
          msg.respond(d);
          generatedBadges++;
        })
        .catch((err) => {
          errors++;
          lastError = err;
          const h = headers();
          if (err instanceof ServiceError) {
            h.set(ServiceErrorHeader, `${err.code} ${err.message}`);
          } else {
            h.set(ServiceErrorHeader, `400 ${err.message}`);
          }
          console.log(
            `${service.name} failed to generate a badge: ${err.message}`,
          );
          msg.respond(Empty, { headers: h });
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
