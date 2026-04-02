use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

/// Newtype wrapper so Tauri can manage the config directory path
/// without ambiguity against other PathBuf-typed managed state.
pub struct ConfigDir(pub std::path::PathBuf);

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Preferences {
    pub cooloff_minutes: f64,
    pub poll_interval_secs: f64,
    pub output_lines: usize,
    pub show_idle_output: bool,
    pub context_zone_max_height: u32,
    pub grid_columns: u32,
    pub scroll_pause_secs: f64,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            cooloff_minutes: 5.0,
            poll_interval_secs: 1.5,
            output_lines: 20,
            show_idle_output: false,
            context_zone_max_height: 192,
            grid_columns: 2,
            scroll_pause_secs: 5.0,
        }
    }
}

impl Preferences {
    pub fn validate(&self) -> Result<(), String> {
        if !(0.0..=60.0).contains(&self.cooloff_minutes) {
            return Err("Cool-off period must be between 0 and 60 minutes".to_string());
        }
        if !(0.5..=30.0).contains(&self.poll_interval_secs) {
            return Err("Poll interval must be between 0.5 and 30 seconds".to_string());
        }
        if !(1..=200).contains(&self.output_lines) {
            return Err("Output lines must be between 1 and 200".to_string());
        }
        if !(48..=800).contains(&self.context_zone_max_height) {
            return Err("Context zone height must be between 48 and 800 pixels".to_string());
        }
        if !(1..=6).contains(&self.grid_columns) {
            return Err("Grid columns must be between 1 and 6".to_string());
        }
        if !(0.0..=60.0).contains(&self.scroll_pause_secs) {
            return Err("Scroll pause must be between 0 and 60 seconds".to_string());
        }
        Ok(())
    }

    pub fn load(config_dir: &Path) -> Self {
        let path = config_dir.join("preferences.json");
        match fs::read_to_string(&path) {
            Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
            Err(_) => Self::default(),
        }
    }

    pub fn save(&self, config_dir: &Path) -> Result<(), String> {
        fs::create_dir_all(config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
        let path = config_dir.join("preferences.json");
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize preferences: {}", e))?;
        fs::write(&path, json)
            .map_err(|e| format!("Failed to write preferences file: {}", e))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_default_values() {
        let prefs = Preferences::default();
        assert_eq!(prefs.cooloff_minutes, 5.0);
        assert_eq!(prefs.poll_interval_secs, 1.5);
        assert_eq!(prefs.output_lines, 20);
        assert!(!prefs.show_idle_output);
        assert_eq!(prefs.context_zone_max_height, 192);
        assert_eq!(prefs.grid_columns, 2);
        assert_eq!(prefs.scroll_pause_secs, 5.0);
    }

    #[test]
    fn test_validate_accepts_defaults() {
        assert!(Preferences::default().validate().is_ok());
    }

    #[test]
    fn test_validate_rejects_out_of_range() {
        let mut prefs = Preferences::default();

        prefs.poll_interval_secs = 0.1;
        assert!(prefs.validate().is_err());
        prefs.poll_interval_secs = 1.5;

        prefs.cooloff_minutes = -1.0;
        assert!(prefs.validate().is_err());
        prefs.cooloff_minutes = 5.0;

        prefs.output_lines = 0;
        assert!(prefs.validate().is_err());
        prefs.output_lines = 20;

        prefs.context_zone_max_height = 10;
        assert!(prefs.validate().is_err());
        prefs.context_zone_max_height = 192;

        prefs.grid_columns = 0;
        assert!(prefs.validate().is_err());
        prefs.grid_columns = 2;

        prefs.scroll_pause_secs = -1.0;
        assert!(prefs.validate().is_err());
    }

    #[test]
    fn test_save_load_roundtrip() {
        let dir = std::env::temp_dir().join("muxara_test_prefs_roundtrip");
        let _ = fs::remove_dir_all(&dir);

        let mut prefs = Preferences::default();
        prefs.grid_columns = 3;
        prefs.poll_interval_secs = 2.0;
        prefs.save(&dir).unwrap();

        let loaded = Preferences::load(&dir);
        assert_eq!(prefs, loaded);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_load_missing_file_returns_default() {
        let dir = std::env::temp_dir().join("muxara_test_prefs_missing");
        let _ = fs::remove_dir_all(&dir);
        let loaded = Preferences::load(&dir);
        assert_eq!(loaded, Preferences::default());
    }

    #[test]
    fn test_load_corrupt_file_returns_default() {
        let dir = std::env::temp_dir().join("muxara_test_prefs_corrupt");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("preferences.json"), "not json at all {{{").unwrap();

        let loaded = Preferences::load(&dir);
        assert_eq!(loaded, Preferences::default());

        let _ = fs::remove_dir_all(&dir);
    }
}
