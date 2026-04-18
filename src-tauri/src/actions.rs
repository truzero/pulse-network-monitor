//! Inspect, kill tree, Finder reveal.

use std::collections::HashMap;
use std::process::Command;

use sysinfo::{Pid, Signal};
use tauri::State;

use crate::dto::{refresh, InspectorResult, PulseSystem};

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
