//! TCP listener → PID mapping via `lsof`.

use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};

use regex::Regex;

use crate::dto::PortBinding;

pub fn port_bindings() -> Vec<PortBinding> {
    let Ok(re) = Regex::new(
        r"^\S+\s+(\d+).*TCP\s+(?:\*|[\d.]+|[\da-fA-F:]+):(\d+)\s+\(LISTEN\)",
    ) else {
        return Vec::new();
    };
    let mut out = Vec::new();
    let Ok(mut child) = Command::new("lsof")
        .args(["-nP", "-iTCP", "-sTCP:LISTEN"])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
    else {
        return out;
    };
    let Some(stdout) = child.stdout.take() else {
        return out;
    };
    for line in BufReader::new(stdout).lines().map_while(Result::ok) {
        if let Some(cap) = re.captures(&line) {
            let pid: u32 = cap[1].parse().unwrap_or(0);
            let port: u16 = cap[2].parse().unwrap_or(0);
            if pid > 0 && port > 0 {
                out.push(PortBinding { port, pid });
            }
        }
    }
    let _ = child.wait();
    out.sort_by(|a, b| a.port.cmp(&b.port));
    out.dedup_by(|a, b| a.port == b.port && a.pid == b.pid);
    out
}

#[tauri::command]
pub fn get_process_map() -> Result<Vec<PortBinding>, String> {
    Ok(port_bindings())
}
