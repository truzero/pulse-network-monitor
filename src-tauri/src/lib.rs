//! Pulse — truzero system intelligence (Tauri shell).

use std::sync::Mutex;

use sysinfo::System;

mod pulse_commands;

use pulse_commands::{
    get_process_sockets, get_pulse_snapshot, get_process_map, inspect_process, kill_recursive,
    reveal_in_finder,
    PulseSystem,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(PulseSystem(Mutex::new(System::new_all())))
        .invoke_handler(tauri::generate_handler![
            get_pulse_snapshot,
            get_process_map,
            inspect_process,
            get_process_sockets,
            kill_recursive,
            reveal_in_finder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
