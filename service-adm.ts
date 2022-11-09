import { cli, Command, Flags } from "https://deno.land/x/cobra@v0.0.9/mod.ts";
import {
  connect,
  deferred,
  Empty,
  JSONCodec,
  millis,
  Msg,
  NatsConnection,
  RequestStrategy,
  ServiceErrorHeader,
  ServiceInfo,
  ServiceSchema,
  ServiceStats,
} from "https://raw.githubusercontent.com/nats-io/nats.deno/dev/src/mod.ts";

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

function createConnection(flags: Flags): Promise<NatsConnection> {
  const servers = [flags.value<string>("server")];
  return connect({ servers });
}

function subject(verb: string, flags: Flags, required = false): string {
  const chunks = ["$SRV", verb];
  const name = flags.value<string>("name").toUpperCase();
  if (required && name === "") {
    throw new Error("--name is required");
  }
  if (name) {
    chunks.push(name);
    const id = flags.value<string>("id").toUpperCase();
    if (required && id === "") {
      throw new Error("--id is required");
    }
    if (id) {
      chunks.push(id);
    }
  }
  return chunks.join(".");
}

root.addCommand({
  use: "ping [--name] [--id]",
  short: "pings services",
  run: async (
    cmd: Command,
    _args: string[],
    flags: Flags,
  ): Promise<number> => {
    const jc = JSONCodec<ServiceInfo>();
    const nc = await createConnection(flags);
    const subj = subject("PING", flags);
    const iter = await nc.requestMany(subj, Empty, {
      strategy: RequestStrategy.JitterTimer,
    });

    const buf: Msg[] = [];
    for await (const m of iter) {
      if (m instanceof Error) {
        break;
      }
      buf.push(m);
    }
    const infos = buf.map((m) => {
      return jc.decode(m.data);
    });
    infos.sort((a, b) => {
      const A = `${a.name} ${a.version}`;
      const B = `${b.name} ${b.version}`;
      return B.localeCompare(A);
    });
    if (infos.length) {
      console.table(infos);
    } else {
      cmd.stdout("no services found");
    }
    await nc.close();
    return 0;
  },
});

root.addCommand({
  use: "status [--name] [--id]",
  short: "get service status",
  run: async (
    cmd: Command,
    _args: string[],
    flags: Flags,
  ): Promise<number> => {
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

    const buf: Msg[] = [];
    for await (const m of iter) {
      if (m instanceof Error) {
        break;
      }
      buf.push(m);
    }

    const infos = buf.map((m) => {
      return infoJC.decode(m.data);
    });

    const stats = infos.map((info) => {
      const { id, version, name } = info;
      let { num_requests, num_errors, total_latency, average_latency } =
        info.stats[0];
      total_latency = millis(total_latency);
      average_latency = millis(average_latency);
      return {
        name,
        version,
        id,
        num_requests,
        num_errors,
        total_latency,
        average_latency,
      };
    });

    stats.sort((a, b) => {
      return b.num_requests - a.num_requests;
    });

    if (stats.length) {
      console.table(stats);
    } else {
      cmd.stdout("no services found");
    }

    await nc.close();
    return 0;
  },
});

root.addCommand({
  use: "info [--name] [--id]",
  short: "get service info",
  run: async (
    cmd: Command,
    _args: string[],
    flags: Flags,
  ): Promise<number> => {
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
    const buf: Msg[] = [];
    for await (const m of iter) {
      if (m instanceof Error) {
        break;
      }
      buf.push(m);
    }
    const infos = buf.map((m) => {
      return infoJC.decode(m.data);
    });
    infos.sort((a, b) => {
      const A = `${a.name} ${a.version}`;
      const B = `${b.name} ${b.version}`;
      return B.localeCompare(A);
    });
    if (infos.length) {
      console.table(infos);
    } else {
      cmd.stdout("no services found");
    }
    await nc.close();
    return 0;
  },
});

root.addCommand({
  use: "schema --name name --id id",
  short: "get services schema",
  run: async (cmd: Command, _args: string[], flags: Flags): Promise<number> => {
    const jc = JSONCodec<ServiceSchema>();
    const nc = await createConnection(flags);
    const subj = subject("SCHEMA", flags, true);
    const r = await nc.request(subj);
    if (r.headers?.has(ServiceErrorHeader)) {
      cmd.stdout(
        `error while processing request: ${r.headers.get(ServiceErrorHeader)}`,
      );
    } else {
      console.table(jc.decode(r.data));
    }
    await nc.close();
    return 0;
  },
});

const start = root.addCommand({
  use: "start",
  short: "start a service",
  run: () => {
    return Promise.resolve(0);
  },
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
  run: async (
    _cmd: Command,
    _args: string[],
    flags: Flags,
  ): Promise<number> => {
    const d = deferred();
    const max = flags.value<number>("count");
    for (let i = 0; i < max; i++) {
      new Worker(new URL("service.ts", import.meta.url).href, {
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
  run: async (
    _cmd: Command,
    _args: string[],
    flags: Flags,
  ): Promise<number> => {
    const d = deferred();
    const max = flags.value<number>("count");
    for (let i = 0; i < max; i++) {
      new Worker(
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
