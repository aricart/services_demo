import {
  connect,
  JSONCodec,
  ServiceError,
} from "https://raw.githubusercontent.com/nats-io/nats.deno/main/src/mod.ts";
import { generateBadge } from "./generator.ts";

type Badge = {
  name: string;
  company?: string;
};

const jc = JSONCodec<Badge>();
const nc = await connect({ servers: "demo.nats.io" });

const service = await nc.services.add({
  name: "badge_generator",
  version: "0.0.1",
  description: "Generates a RethinkConn badge",
  endpoint: {
    subject: "generate.badge",
    schema: {
      request: "{ name: string, company?: string }",
      response: "Uint8Array",
    },
    handler: (err, msg) => {
      if (err) {
        // stop will stop the service, and close it with the specified error
        service.stop(err).then();
        return;
      }
      const req = jc.decode(msg.data);
      if (typeof req.name !== "string" || req.name.length === 0) {
        console.log(
          `${service.info().name} is rejecting a request without a name`,
        );
        // you can report an error to the client
        msg.respondError(400, "name is required");
        return;
      }
      return generateBadge(req)
        .then((d) => {
          msg.respond(d);
        })
        .catch((err) => {
          const sr = ServiceError.toServiceError(err);
          msg.respondError(sr?.code, sr?.message);
        });
    },
  },
});

const si = service.info();
// you can monitor if your service closes by awaiting done - it resolves
// to null or an error
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
