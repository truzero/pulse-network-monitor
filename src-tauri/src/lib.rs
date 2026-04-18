//! Pulse — truzero system intelligence (Tauri shell).

mod actions;
mod dto;
mod ports;
mod snapshot;

use dto::PulseSystem;
use sysinfo::System;
use std::sync::Mutex;

use actions::{inspect_process, kill_recursive, reveal_in_finder};
use ports::get_process_map;
use snapshot::get_pulse_snapshot;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(PulseSystem(Mutex::new(System::new_all())))
        .invoke_handler(tauri::generate_handler![
            get_pulse_snapshot,
            get_process_map,
            inspect_process,
            kill_recursive,
            reveal_in_finder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
