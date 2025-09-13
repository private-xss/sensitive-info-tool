use std::fs;
use std::path::PathBuf;
use tauri::{State, Manager, api::path::app_data_dir, Config};

struct AppState {
    data_dir: PathBuf,
}

impl AppState {
    fn new(config: &Config) -> Result<Self, Box<dyn std::error::Error>> {
        let app_data_dir = app_data_dir(config).ok_or("无法获取应用数据目录")?;
        let data_dir = app_data_dir.join("data");
        
        if !data_dir.exists() {
            fs::create_dir_all(&data_dir)?;
        }
        
        Ok(Self { data_dir })
    }
    
    fn get_file_path(&self, key: &str) -> PathBuf {
        self.data_dir.join(format!("{}.json", key))
    }
}

#[tauri::command]
fn save_data(key: String, data: String, state: State<AppState>) -> Result<(), String> {
    let file_path = state.get_file_path(&key);
    fs::write(file_path, data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_data(key: String, state: State<AppState>) -> Result<Option<String>, String> {
    let file_path = state.get_file_path(&key);
    if file_path.exists() {
        let content = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn delete_data(key: String, state: State<AppState>) -> Result<(), String> {
    let file_path = state.get_file_path(&key);
    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn list_data_keys(state: State<AppState>) -> Result<Vec<String>, String> {
    let mut keys = Vec::new();
    if state.data_dir.exists() {
        for entry in fs::read_dir(&state.data_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            if let Some(file_name) = entry.file_name().to_str() {
                if file_name.ends_with(".json") {
                    let key = file_name.trim_end_matches(".json");
                    keys.push(key.to_string());
                }
            }
        }
    }
    Ok(keys)
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let _app_handle = app.handle();
            let config = app.config().clone();
            
            // 初始化应用状态
            let app_state = match AppState::new(&config) {
                Ok(state) => state,
                Err(e) => {
                    eprintln!("初始化应用状态失败: {}", e);
                    std::process::exit(1);
                }
            };
            // 将状态管理添加到应用
            app.manage(app_state);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_data,
            load_data,
            delete_data,
            list_data_keys
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
