import { cli, Command, Flags } from "https://deno.land/x/cobra/mod.ts";
import {
  connect,
  JSONCodec,
  NatsConnection,
} from "https://raw.githubusercontent.com/nats-io/nats.deno/dev/src/mod.ts";

const root = cli({
  use: "get-badge --name name [--company company]",
  run: async (cmd: Command, args: string[], flags: Flags): Promise<number> => {
    const name = flags.value<string>("name");
    const company = flags.value<string>("company");
    const nc = await createConnection(flags);
    const fp = await Deno.makeTempFile();
    console.log(fp);
    const jc = JSONCodec();
    const msg = await nc.request(
      "generate.badge",
      jc.encode({ name, company }),
      { timeout: 30 * 1000 },
    );
    await Deno.writeFile(fp, msg.data);
    cmd.stdout(`wrote your badge to file://${fp}`);
    return 0;
  },
});
root.addFlag({
  short: "n",
  name: "name",
  type: "string",
  usage: "your name",
  default: "",
  persistent: true,
});
root.addFlag({
  name: "company",
  type: "string",
  usage: "your company",
  default: "",
  persistent: true,
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
