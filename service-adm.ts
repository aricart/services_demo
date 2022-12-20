import { cli, Command, Flags } from "https://deno.land/x/cobra@v0.0.9/mod.ts";
import {
  connect,
  deferred,
  millis,
  NatsConnection,
} from "https://raw.githubusercontent.com/nats-io/nats.deno/main/src/mod.ts";
import { collect } from "https://raw.githubusercontent.com/nats-io/nats.deno/main/nats-base-client/util.ts";

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

function options(
  flags: Flags,
): { name?: string; id?: string } {
  let name: string | undefined = flags.value<string>("name");
  if (name === "") {
    name = undefined;
  }
  let id: string | undefined = flags.value<string>("id");
  if (id === "") {
    id = undefined;
  }
  return { name, id };
}

root.addCommand({
  use: "ping [--name] [--id]",
  short: "pings services",
  run: async (
    cmd: Command,
    _args: string[],
    flags: Flags,
  ): Promise<number> => {
    const nc = await createConnection(flags);
    const opts = options(flags);
    const mc = nc.services.client();
    const infos = (await collect(await mc.ping(opts.name, opts.id))).sort(
      (a, b) => {
        const A = `${a.name} ${a.version}`;
        const B = `${b.name} ${b.version}`;
        return B.localeCompare(A);
      },
    );
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
  use: "stats [--name] [--id]",
  short: "get service stats",
  run: async (
    cmd: Command,
    _args: string[],
    flags: Flags,
  ): Promise<number> => {
    const nc = await createConnection(flags);
    const mc = nc.services.client();
    const opts = options(flags);
    const stats = (await collect(await mc.stats(opts.name, opts.id))).map(
      (s) => {
        s.processing_time = millis(s.processing_time);
        s.average_processing_time = millis(s.average_processing_time);
        return s;
      },
    );

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
    const nc = await createConnection(flags);
    const mc = nc.services.client();
    const opts = options(flags);

    const infos = (await collect(await mc.info(opts.name, opts.id))).sort(
      (a, b) => {
        const A = `${a.name} ${a.version}`;
        const B = `${b.name} ${b.version}`;
        return B.localeCompare(A);
      },
    );
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
    const nc = await createConnection(flags);
    const mc = nc.services.client();
    const opts = options(flags);
    const schemas = await collect(await mc.schema(opts.name, opts.id));
    if (schemas.length) {
      console.table(schemas);
    } else {
      cmd.stdout("no services found");
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
        //@ts-ignore: deno
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
          //@ts-ignore: deno
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
