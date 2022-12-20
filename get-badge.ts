import { cli, Command, Flags } from "https://deno.land/x/cobra@v0.0.9/mod.ts";
import {
  connect,
  ErrorCode,
  JSONCodec,
  NatsConnection,
  ServiceErrorHeader,
} from "https://raw.githubusercontent.com/nats-io/nats.deno/main/src/mod.ts";

const root = cli({
  use: "get-badge --name name [--company company]",
  run: async (cmd: Command, _args: string[], flags: Flags): Promise<number> => {
    const name = flags.value<string>("name");
    const company = flags.value<string>("company");
    const nc = await createConnection(flags);
    const jc = JSONCodec();
    return nc.request(
      "generate.badge",
      jc.encode({ name, company }),
      { timeout: 30 * 1000 },
    ).then((msg) => {
      if (msg.headers?.get(ServiceErrorHeader)) {
        console.log(
          `error processing your request: ${
            msg.headers.get(ServiceErrorHeader)
          }`,
        );
        return 1;
      }
      const fp = Deno.makeTempFileSync({ suffix: ".pdf" });
      Deno.writeFileSync(fp, msg.data);
      cmd.stdout(`wrote badge to file://${fp}`);
      return 0;
    }).catch((err) => {
      if (err.code === ErrorCode.NoResponders) {
        cmd.stdout(`sorry no generator-service was found`);
      } else {
        cmd.stdout(`error: ${err.message}`);
      }
      return 1;
    });
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

function createConnection(flags: Flags): Promise<NatsConnection> {
  const servers = [flags.value<string>("server")];
  return connect({ servers });
}

Deno.exit(await root.execute(Deno.args));
