import { cli, Command, Flags } from "https://deno.land/x/cobra@v0.0.9/mod.ts";
import {
  connect,
  Empty,
  JSONCodec,
  NatsConnection,
  ServiceErrorHeader,
} from "https://raw.githubusercontent.com/nats-io/nats.deno/dev/src/mod.ts";

const root = cli({
  use: "get-freq ",
  run: async (
    _cmd: Command,
    _args: string[],
    flags: Flags,
  ): Promise<number> => {
    const nc = await createConnection(flags);
    const msg = await nc.request(
      "badge.freq",
      Empty,
      { timeout: 30 * 1000 },
    );

    if (msg.headers?.get(ServiceErrorHeader)) {
      console.log(
        `error processing your request: ${msg.headers.get(ServiceErrorHeader)}`,
      );
      return 1;
    }

    const jc = JSONCodec();
    const m = jc.decode(msg.data);
    if (Object.keys(m).length) {
      console.table(m);
    } else {
      console.log("no badge generation requests seen");
    }

    return 0;
  },
});

root.addFlag({
  name: "server",
  type: "string",
  usage: "NATS server to connect to",
  default: "demo.nats.io",
  persistent: true,
});

function createConnection(flags: Flags): Promise<NatsConnection> {
  const servers = [flags.value<string>("server")];
  return connect({ servers });
}

Deno.exit(await root.execute(Deno.args));
