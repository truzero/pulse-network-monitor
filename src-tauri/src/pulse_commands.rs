//! Pulse system intelligence commands (sysinfo + port map + kill tree).

use std::collections::{HashMap, HashSet};
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::Mutex;

use regex::Regex;
use serde::Serialize;
use sysinfo::{Pid, ProcessStatus, Signal, System, Users};
use tauri::State;

fn uid_as_u32(uid: Option<&sysinfo::Uid>) -> Option<u32> {
    uid.and_then(|u| u.to_string().parse().ok())
}

fn user_for_uid(users: &Users, uid: Option<u32>) -> Option<String> {
    let uid = uid?;
    let uid_t = sysinfo::Uid::try_from(uid as usize).ok()?;
    users.get_user_by_id(&uid_t).map(|u| u.name().to_string())
}

/// Shared sysinfo handle; refreshed on each snapshot / command.
pub struct PulseSystem(pub Mutex<System>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortBinding {
    pub port: u16,
    pub pid: u32,
    pub protocol: String,
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
    pub uid: Option<u32>,
    pub user: Option<String>,
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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SocketRow {
    pub protocol: String,
    pub local_address: String,
    pub remote_address: Option<String>,
    pub state: Option<String>,
}

fn refresh(sys: &mut System) {
    sys.refresh_memory();
    sys.refresh_cpu_usage();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
}

fn port_bindings() -> Vec<PortBinding> {
    let Ok(re_tcp) = Regex::new(
        r"^\S+\s+(\d+).*TCP\s+(?:\*|[\d.]+|[\da-fA-F:]+):(\d+)\s+\(LISTEN\)",
    ) else {
        return Vec::new();
    };
    let Ok(re_udp) =
        Regex::new(r"^\S+\s+(\d+).*UDP\s+(?:\*|[\d.]+|[\da-fA-F:]+):(\d+)\b")
    else {
        return Vec::new();
    };

    let mut out = Vec::new();

    // TCP listeners.
    if let Ok(mut child) = Command::new("lsof")
        .args(["-nP", "-iTCP", "-sTCP:LISTEN"])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
    {
        if let Some(stdout) = child.stdout.take() {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                if let Some(cap) = re_tcp.captures(&line) {
                    let pid: u32 = cap[1].parse().unwrap_or(0);
                    let port: u16 = cap[2].parse().unwrap_or(0);
                    if pid > 0 && port > 0 {
                        out.push(PortBinding {
                            port,
                            pid,
                            protocol: "TCP".into(),
                        });
                    }
                }
            }
        }
        let _ = child.wait();
    }

    // UDP bound ports (best-effort).
    if let Ok(mut child) = Command::new("lsof")
        .args(["-nP", "-iUDP"])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
    {
        if let Some(stdout) = child.stdout.take() {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                if let Some(cap) = re_udp.captures(&line) {
                    let pid: u32 = cap[1].parse().unwrap_or(0);
                    let port: u16 = cap[2].parse().unwrap_or(0);
                    if pid > 0 && port > 0 {
                        out.push(PortBinding {
                            port,
                            pid,
                            protocol: "UDP".into(),
                        });
                    }
                }
            }
        }
        let _ = child.wait();
    }

    out.sort_by(|a, b| a.port.cmp(&b.port));
    out.dedup_by(|a, b| a.port == b.port && a.pid == b.pid && a.protocol == b.protocol);
    out
}

fn build_snapshot(sys: &mut System) -> PulseSnapshot {
    refresh(sys);
    let port_map = port_bindings();
    let users = Users::new_with_refreshed_list();
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
        let uid = uid_as_u32(proc.effective_user_id().or_else(|| proc.user_id()));

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
            uid,
            user: user_for_uid(&users, uid),
            status: status_str,
            warning: zombie || orphan,
        });
    }

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

#[tauri::command]
pub fn get_process_map() -> Result<Vec<PortBinding>, String> {
    Ok(port_bindings())
}

fn env_for_pid(pid: u32) -> Vec<(String, String)> {
    #[cfg(target_os = "linux")]
    {
        let path = format!("/proc/{pid}/environ");
        if let Ok(raw) = std::fs::read(path) {
            return raw
                .split(|b| *b == 0)
                .filter_map(|chunk| std::str::from_utf8(chunk).ok())
                .filter_map(|pair| pair.split_once('='))
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect();
        }
    }
    let Ok(output) = Command::new("ps")
        .args(["eww", "-p", &pid.to_string(), "-o", "command="])
        .output()
    else {
        return Vec::new();
    };
    let Ok(s) = String::from_utf8(output.stdout) else {
        return Vec::new();
    };
    parse_ps_env_line(&s)
}

fn parse_ps_env_line(line: &str) -> Vec<(String, String)> {
    let mut env = Vec::new();
    for tok in line.split_whitespace() {
        if let Some((k, v)) = tok.split_once('=') {
            if k.chars().all(|c| c.is_alphanumeric() || c == '_') {
                env.push((k.to_string(), v.to_string()));
            }
        }
    }
    env
}

#[tauri::command]
pub fn inspect_process(state: State<'_, PulseSystem>, pid: u32) -> Result<InspectorResult, String> {
    let mut sys = state.0.lock().map_err(|_| "system lock poisoned".to_string())?;
    refresh(&mut sys);
    let pid_t = Pid::from_u32(pid);
    let proc = sys
        .process(pid_t)
        .ok_or_else(|| format!("process {pid} not found"))?;
    let cwd = proc.cwd().map(|p| p.to_string_lossy().into_owned());
    let env = env_for_pid(pid);
    Ok(InspectorResult {
        pid,
        exe: proc.exe().map(|p| p.to_string_lossy().into_owned()),
        cwd,
        cmd: proc
            .cmd()
            .iter()
            .map(|s| s.to_string_lossy().into_owned())
            .collect(),
        env,
    })
}

fn parse_lsof_socket_name(name: &str) -> Option<SocketRow> {
    let parts: Vec<&str> = name.split_whitespace().collect();
    let proto_idx = parts
        .iter()
        .position(|p| *p == "TCP" || *p == "UDP")?;
    let protocol = parts[proto_idx].to_string();
    let mut rest = parts[proto_idx + 1..].join(" ");

    let mut state = None;
    if let Some((head, tail)) = rest.rsplit_once(' ') {
        if tail.starts_with('(') && tail.ends_with(')') {
            state = Some(tail.trim_matches(['(', ')']).to_string());
            rest = head.to_string();
        }
    }

    let (local_address, remote_address) = if let Some((l, r)) = rest.split_once("->") {
        (l.trim().to_string(), Some(r.trim().to_string()))
    } else {
        (rest.trim().to_string(), None)
    };

    if local_address.is_empty() {
        return None;
    }

    Some(SocketRow {
        protocol,
        local_address,
        remote_address,
        state,
    })
}

#[tauri::command]
pub fn get_process_sockets(pid: u32) -> Result<Vec<SocketRow>, String> {
    let out = Command::new("lsof")
        .args(["-nP", "-i", "-a", "-p", &pid.to_string()])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .map_err(|e| e.to_string())?;

    if !out.status.success() {
        return Ok(Vec::new());
    }

    let Ok(s) = String::from_utf8(out.stdout) else {
        return Ok(Vec::new());
    };

    let mut rows = Vec::new();
    for (i, line) in s.lines().enumerate() {
        if i == 0 {
            continue;
        }

        if let Some(name_idx) = line.find(" TCP ").or_else(|| line.find(" UDP ")) {
            let name = &line[name_idx + 1..];
            if let Some(row) = parse_lsof_socket_name(name) {
                rows.push(row);
            }
        } else if line.contains("TCP") || line.contains("UDP") {
            if let Some(row) = parse_lsof_socket_name(line) {
                rows.push(row);
            }
        }
    }

    Ok(rows)
}

fn collect_kill_order(children: &HashMap<Pid, Vec<Pid>>, root: Pid, out: &mut Vec<Pid>) {
    if let Some(chs) = children.get(&root) {
        for c in chs {
            collect_kill_order(children, *c, out);
        }
    }
    out.push(root);
}

#[tauri::command]
pub fn kill_recursive(state: State<'_, PulseSystem>, pid: u32) -> Result<(), String> {
    let mut sys = state.0.lock().map_err(|_| "system lock poisoned".to_string())?;
    refresh(&mut sys);
    let root = Pid::from_u32(pid);
    if sys.process(root).is_none() {
        return Err(format!("pid {pid} not found"));
    }
    let mut children: HashMap<Pid, Vec<Pid>> = HashMap::new();
    for (cpid, proc) in sys.processes() {
        if let Some(ppid) = proc.parent() {
            children.entry(ppid).or_default().push(*cpid);
        }
    }
    let mut order = Vec::new();
    collect_kill_order(&children, root, &mut order);
    for p in order {
        if let Some(proc) = sys.process(p) {
            let _ = proc.kill_with(Signal::Kill);
        }
    }
    Ok(())
}

#[tauri::command]
pub fn reveal_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let st = Command::new("open").args(["-R", &path]).status();
        return match st {
            Ok(s) if s.success() => Ok(()),
            Ok(_) => Err("open -R failed".into()),
            Err(e) => Err(e.to_string()),
        };
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = path;
        Err("Reveal in Finder is macOS-only".into())
    }
}

