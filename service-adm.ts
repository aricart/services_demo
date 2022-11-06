import { cli, Command, Flags } from "https://deno.land/x/cobra/mod.ts";
import {
  connect,
  deferred,
  Empty,
  JSONCodec,
  Msg,
  NatsConnection,
  ServiceInfo,
  ServiceStats,
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
      buf.push(jc.decode((m as Msg).data));
    }
    buf.sort((a, b) => {
      const A = `${a.name} ${a.version}`;
      const B = `${b.name} ${b.version}`;
      return B.localeCompare(A);
    });
    console.table(buf);
    await nc.close();
    return 0;
  },
});

root.addCommand({
  use: "status [--name] [--id]",
  short: "get service status",
  run: async (cmd: Command, args: string[], flags: Flags): Promise<number> => {
    const infoJC = JSONCodec<ServiceStats>();
    const nc = await createConnection(flags);
    const subj = subject("STATUS", flags);
    const iter = await nc.requestMany(
      subj,
      JSONCodec().encode({ internal: false }),
      {
        strategy: RequestStrategy.JitterTimer,
      },
    );
    const buf: unknown[] = [];
    for await (const m of iter) {
      const o = infoJC.decode((m as Msg).data);
      const stats = o.stats[0];
      delete stats.data;
      const data = stats.data;
      const oo = o as Record<string, unknown>;
      delete oo.stats;
      buf.push(Object.assign(o, stats, data));
    }

    buf.sort((a, b) => {
      return b.num_requests - a.num_requests;
    });

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
      buf.push(infoJC.decode((m as Msg).data));
    }
    buf.sort((a, b) => {
      const A = `${a.name} ${a.version}`;
      const B = `${b.name} ${b.version}`;
      return B.localeCompare(A);
    });
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

const start = root.addCommand({
  use: "start",
  short: "start a service",
});

start.addFlag({
  name: "count",
  type: "number",
  usage: "number of services to start",
  default: "1",
  persistent: true,
});

start.addCommand({
  use: "generator",
  short: "start generator(s)",
  run: async (cmd: Command, args: string[], flags: Flags): Promise<number> => {
    const d = deferred();
    const max = flags.value<number>("count");
    for (let i = 0; i < max; i++) {
      const worker = new Worker(new URL("service.ts", import.meta.url).href, {
        type: "module",
        deno: true,
      });
    }

    // wait forever
    await d;
    return 0;
  },
});

start.addCommand({
  use: "frequency",
  short: "start frequency(s)",
  run: async (cmd: Command, args: string[], flags: Flags): Promise<number> => {
    const d = deferred();
    const max = flags.value<number>("count");
    for (let i = 0; i < max; i++) {
      const worker = new Worker(
        new URL("frequency-service.ts", import.meta.url).href,
        {
          type: "module",
          deno: true,
        },
      );
    }

    // wait forever
    await d;
    return 0;
  },
});

Deno.exit(await root.execute(Deno.args));
