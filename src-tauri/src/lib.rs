use std::fs;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn load_csv_data() -> Result<String, String> {
    // Read the file directly. Relative to where `npm run tauri dev` runs.
    fs::read_to_string("result.csv")
        .map_err(|e| format!("Failed to read result.csv: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![load_csv_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
