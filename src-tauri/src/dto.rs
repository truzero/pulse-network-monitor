//! Shared DTOs and sysinfo refresh helpers.

use std::sync::Mutex;

use serde::Serialize;
use sysinfo::System;

/// Shared sysinfo handle; refreshed on each snapshot / command.
pub struct PulseSystem(pub Mutex<System>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortBinding {
    pub port: u16,
    pub pid: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessRow {
    pub pid: u32,
    pub ppid: Option<u32>,
    pub name: String,
    pub cpu: f32,
    pub memory: u64,
    pub cmd: Vec<String>,
    pub exe: Option<String>,
    pub status: String,
    pub warning: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PulseSnapshot {
    pub global_cpu: f32,
    pub used_memory: u64,
    pub total_memory: u64,
    pub processes: Vec<ProcessRow>,
    pub port_map: Vec<PortBinding>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectorResult {
    pub pid: u32,
    pub exe: Option<String>,
    pub cwd: Option<String>,
    pub cmd: Vec<String>,
    pub env: Vec<(String, String)>,
}

pub fn refresh(sys: &mut System) {
    sys.refresh_memory();
    sys.refresh_cpu_usage();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
}
