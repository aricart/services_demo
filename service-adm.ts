import { cli, Command, Flags } from "https://deno.land/x/cobra/mod.ts";
import {
  connect,
  Empty,
  JSONCodec,
  NatsConnection,
  ServiceInfo,
} from "https://raw.githubusercontent.com/nats-io/nats.deno/dev/src/mod.ts";

import {
  RequestStrategy,
} from "https://raw.githubusercontent.com/nats-io/nats.deno/dev/nats-base-client/types.ts";

const root = cli({
  use: "service-adm (ping|info|status|schema) [--name name] [--id id]",
});
root.addFlag({
  short: "n",
  name: "name",
  type: "string",
  usage: "service name to filter on",
  default: "",
  persistent: true,
});
root.addFlag({
  name: "id",
  type: "string",
  usage: "service id to filter on",
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

function subject(verb: string, flags: Flags): string {
  const chunks = ["$SRV", verb];
  const name = flags.value<string>("name").toUpperCase();
  if (name) {
    chunks.push(name);
    const id = flags.value<string>("id").toUpperCase();
    if (id) {
      chunks.push(id);
    }
  }
  return chunks.join(".");
}

root.addCommand({
  use: "ping [--name] [--id]",
  short: "pings services",
  run: async (cmd: Command, args: string[], flags: Flags): Promise<number> => {
    const jc = JSONCodec<ServiceInfo>();
    const nc = await createConnection(flags);
    const subj = subject("PING", flags);
    const iter = await nc.requestMany(subj, Empty, {
      strategy: RequestStrategy.JitterTimer,
    });
    const buf: ServiceInfo[] = [];
    for await (const m of iter) {
      buf.push(jc.decode(m.data));
    }
    console.table(buf);
    await nc.close();
    return 0;
  },
});

root.addCommand({
  use: "status [--name] [--id]",
  short: "get service status",
  run: async (cmd: Command, args: string[], flags: Flags): Promise<number> => {
    const infoJC = JSONCodec<ServiceInfo>();
    const nc = await createConnection(flags);
    const subj = subject("STATUS", flags);
    const iter = await nc.requestMany(
      subj,
      JSONCodec().encode({ internal: false }),
      {
        strategy: RequestStrategy.JitterTimer,
      },
    );
    const buf: ServiceInfo[] = [];
    for await (const m of iter) {
      const o = infoJC.decode(m.data);
      const stats = o.stats[0];
      delete o.stats;
      const data = stats.data;
      delete stats.data;
      buf.push(Object.assign(o, stats, data));
    }
    console.table(buf);
    await nc.close();
    return 0;
  },
});

root.addCommand({
  use: "info [--name] [--id]",
  short: "get service info",
  run: async (cmd: Command, args: string[], flags: Flags): Promise<number> => {
    const infoJC = JSONCodec<ServiceInfo>();
    const nc = await createConnection(flags);
    const subj = subject("INFO", flags);
    const iter = await nc.requestMany(
      subj,
      JSONCodec().encode({ internal: false }),
      {
        strategy: RequestStrategy.JitterTimer,
      },
    );
    const buf: ServiceInfo[] = [];
    for await (const m of iter) {
      const o = infoJC.decode(m.data);
      buf.push(o);
    }
    console.table(buf);
    await nc.close();
    return 0;
  },
});

root.addCommand({
  use: "schema [--name] [--id]",
  short: "get services schema",
  run: async (cmd: Command, args: string[], flags: Flags): Promise<number> => {
    cmd.stdout("not implemented");
    return 0;
  },
});

Deno.exit(await root.execute(Deno.args));
