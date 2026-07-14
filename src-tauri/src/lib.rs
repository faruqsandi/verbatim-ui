pub mod audio;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(audio::commands::AudioState::default());
            audio::commands::init_audio_thread(app.handle());
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            audio::commands::load_audio,
            audio::commands::play_audio,
            audio::commands::pause_audio,
            audio::commands::seek_audio,
            audio::commands::get_audio_time,
            audio::commands::get_audio_duration,
            audio::commands::get_audio_peaks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
