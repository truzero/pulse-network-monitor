import { z } from "zod";

export const PortBindingSchema = z.object({
  port: z.number(),
  pid: z.number(),
  protocol: z.string(),
});

export const ProcessRowSchema = z.object({
  pid: z.number(),
  ppid: z.number().nullable().optional(),
  name: z.string(),
  cpu: z.number(),
  memory: z.number(),
  cmd: z.array(z.string()),
  exe: z.string().nullable().optional(),
  uid: z.number().nullable().optional(),
  user: z.string().nullable().optional(),
  status: z.string(),
  warning: z.boolean(),
});

export const PulseSnapshotSchema = z.object({
  globalCpu: z.number(),
  usedMemory: z.number(),
  totalMemory: z.number(),
  processes: z.array(ProcessRowSchema),
  portMap: z.array(PortBindingSchema),
});

export type PulseSnapshot = z.infer<typeof PulseSnapshotSchema>;
export type ProcessRow = z.infer<typeof ProcessRowSchema>;
export type PortBinding = z.infer<typeof PortBindingSchema>;

export const InspectorSchema = z.object({
  pid: z.number(),
  exe: z.string().nullable().optional(),
  cwd: z.string().nullable().optional(),
  cmd: z.array(z.string()),
  env: z.array(z.tuple([z.string(), z.string()])),
});

export type InspectorData = z.infer<typeof InspectorSchema>;

export const SocketRowSchema = z.object({
  protocol: z.string(),
  localAddress: z.string(),
  remoteAddress: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
});

export type SocketRow = z.infer<typeof SocketRowSchema>;

