// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod oss;

use oss::*;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // OSS
            oss_list_objects,
            oss_list_buckets,
            oss_upload_file,
            oss_download_file,
            oss_delete_file,
            oss_create_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
