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
        // stop will stop the service, and close it with the specified error
        service.stop(err).then();
        return Promise.reject(err);
      }
      const req = jc.decode(msg.data);
      if (typeof req.name !== "string" || req.name.length === 0) {
        console.log(`${service.name} is rejecting a request without a name`);
        // if you reject, the service will respond with an error
        // by convention the error is simply a header in the response
        // o.c. your service may have a different way of signaling a
        // problem.
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

// you can monitor if your service closes by awaiting done - it resolves
// to null or an error
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
