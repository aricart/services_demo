import { cli, Command, Flags } from "https://deno.land/x/cobra/mod.ts";
import {
  connect,
  Empty,
  JSONCodec,
  NatsConnection,
} from "https://raw.githubusercontent.com/nats-io/nats.deno/dev/src/mod.ts";

const root = cli({
  use: "get-freq ",
  run: async (cmd: Command, args: string[], flags: Flags): Promise<number> => {
    const nc = await createConnection(flags);
    const msg = await nc.request(
      "badge.freq",
      Empty,
      { timeout: 30 * 1000 },
    );
    const jc = JSONCodec();
    console.table(jc.decode(msg.data));
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

async function createConnection(flags: Flags): Promise<NatsConnection> {
  const servers = [flags.value<string>("server")];
  return connect({ servers });
}

Deno.exit(await root.execute(Deno.args));
