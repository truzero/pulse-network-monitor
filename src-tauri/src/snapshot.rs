//! Full system snapshot for the UI.

use std::collections::HashSet;

use sysinfo::{Pid, ProcessStatus};
use tauri::State;

use crate::dto::{refresh, ProcessRow, PulseSnapshot, PulseSystem};
use crate::ports::port_bindings;

pub fn build_snapshot(sys: &mut sysinfo::System) -> PulseSnapshot {
    refresh(sys);
    let port_map = port_bindings();
    let pids: HashSet<Pid> = sys.processes().keys().copied().collect();
    let mut processes = Vec::new();
    for (pid, proc) in sys.processes() {
        let st = proc.status();
        let status_str = format!("{st:?}");
        let zombie = matches!(st, ProcessStatus::Zombie);
        let ppid = proc.parent();
        let orphan = ppid
            .map(|p| !pids.contains(&p) && p != Pid::from(0))
            .unwrap_or(false);
        processes.push(ProcessRow {
            pid: pid.as_u32(),
            ppid: ppid.map(|p| p.as_u32()),
            name: proc.name().to_string_lossy().to_string(),
            cpu: proc.cpu_usage(),
            memory: proc.memory(),
            cmd: proc
                .cmd()
                .iter()
                .map(|s| s.to_string_lossy().into_owned())
                .collect(),
            exe: proc.exe().map(|p| p.to_string_lossy().into_owned()),
            status: status_str,
            warning: zombie || orphan,
        });
    }
    processes.sort_by(|a, b| b.cpu.partial_cmp(&a.cpu).unwrap_or(std::cmp::Ordering::Equal));
    let global_cpu = sys.global_cpu_usage();
    PulseSnapshot {
        global_cpu,
        used_memory: sys.used_memory(),
        total_memory: sys.total_memory(),
        processes,
        port_map,
    }
}

#[tauri::command]
pub fn get_pulse_snapshot(state: State<'_, PulseSystem>) -> Result<PulseSnapshot, String> {
    let mut sys = state.0.lock().map_err(|_| "system lock poisoned".to_string())?;
    Ok(build_snapshot(&mut sys))
}
