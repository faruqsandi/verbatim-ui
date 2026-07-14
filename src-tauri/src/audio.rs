pub mod commands {
    use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
    use std::fs::File;
    use std::io::BufReader;
    use std::sync::Mutex;
    use std::time::Duration;
    use tauri::{AppHandle, Manager, State};
    use std::thread;

    pub struct AudioState {
        pub sink: Mutex<Option<Sink>>,
        pub stream_handle: Mutex<Option<OutputStreamHandle>>,
    }

    impl Default for AudioState {
        fn default() -> Self {
            Self {
                sink: Mutex::new(None),
                stream_handle: Mutex::new(None),
            }
        }
    }

    pub fn init_audio_thread(app: &AppHandle) {
        let state = app.state::<AudioState>();
        let (tx, rx) = std::sync::mpsc::channel();
        
        thread::spawn(move || {
            // Try to initialize the output stream. If it fails (e.g. no audio device), 
            // we just send None so the app doesn't crash on startup.
            match OutputStream::try_default() {
                Ok((_stream, stream_handle)) => {
                    tx.send(Some(stream_handle)).unwrap();
                    // Keep thread alive forever so _stream is never dropped
                    loop {
                        thread::sleep(Duration::from_secs(3600));
                    }
                }
                Err(e) => {
                    eprintln!("Audio initialization failed (this is harmless if you have no audio device): {}", e);
                    tx.send(None).unwrap();
                }
            }
        });
        
        let handle = rx.recv().unwrap();
        *state.stream_handle.lock().unwrap() = handle;
    }

    #[tauri::command]
    pub fn load_audio(state: State<'_, AudioState>, path: String) -> Result<(), String> {
        let file = BufReader::new(File::open(&path).map_err(|e| e.to_string())?);
        let source = Decoder::new(file).map_err(|e| e.to_string())?;
        
        let stream_handle_guard = state.stream_handle.lock().unwrap();
        let stream_handle = stream_handle_guard.as_ref().ok_or("Audio system not initialized")?;
        
        let sink = Sink::try_new(stream_handle).map_err(|e| e.to_string())?;
        sink.append(source);
        sink.pause();
        
        let mut sink_guard = state.sink.lock().unwrap();
        *sink_guard = Some(sink);
        
        Ok(())
    }

    #[tauri::command]
    pub fn play_audio(state: State<'_, AudioState>) -> Result<(), String> {
        if let Some(sink) = state.sink.lock().unwrap().as_ref() {
            sink.play();
        }
        Ok(())
    }

    #[tauri::command]
    pub fn pause_audio(state: State<'_, AudioState>) -> Result<(), String> {
        if let Some(sink) = state.sink.lock().unwrap().as_ref() {
            sink.pause();
        }
        Ok(())
    }

    #[tauri::command]
    pub fn seek_audio(state: State<'_, AudioState>, time_secs: f64) -> Result<(), String> {
        if let Some(sink) = state.sink.lock().unwrap().as_ref() {
            let _ = sink.try_seek(Duration::from_secs_f64(time_secs));
        }
        Ok(())
    }

    #[tauri::command]
    pub fn get_audio_time(state: State<'_, AudioState>) -> Result<f64, String> {
        if let Some(sink) = state.sink.lock().unwrap().as_ref() {
            Ok(sink.get_pos().as_secs_f64())
        } else {
            Ok(0.0)
        }
    }

    #[tauri::command]
    pub fn get_audio_duration(path: String) -> Result<f64, String> {
        let file = std::io::BufReader::new(std::fs::File::open(&path).map_err(|e| e.to_string())?);
        let source = rodio::Decoder::new(file).map_err(|e| e.to_string())?;
        use rodio::Source;
        if let Some(duration) = source.total_duration() {
            Ok(duration.as_secs_f64())
        } else {
            Ok(0.0) // Unknown duration for some formats like MP3 without full parsing
        }
    }

    #[tauri::command]
    pub fn get_audio_peaks(path: String, num_peaks: usize) -> Result<Vec<f32>, String> {
        let file = BufReader::new(File::open(&path).map_err(|e| e.to_string())?);
        let source = Decoder::new(file).map_err(|e| e.to_string())?;
        
        let mut peaks = Vec::with_capacity(num_peaks);
        let mut all_samples = Vec::new();
        
        // Downcast samples directly. We know source is an Iterator of i16
        for sample in source {
            all_samples.push(sample.abs() as f32 / 32768.0);
        }
        
        if all_samples.is_empty() {
            return Ok(vec![0.0; num_peaks]);
        }
        
        let chunk_size = (all_samples.len() as f32 / num_peaks as f32).ceil() as usize;
        let chunk_size = chunk_size.max(1);
        
        for chunk in all_samples.chunks(chunk_size) {
            let mut max_val = 0.0_f32;
            for &val in chunk {
                if val > max_val {
                    max_val = val;
                }
            }
            peaks.push(max_val);
        }
        
        while peaks.len() < num_peaks {
            peaks.push(0.0);
        }
        peaks.truncate(num_peaks);
        
        Ok(peaks)
    }
}
