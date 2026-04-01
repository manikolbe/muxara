use std::collections::HashMap;
use std::sync::Mutex;

use tauri::State;

use crate::session::Session;
use crate::store::SessionStore;
use crate::tmux::client;

#[tauri::command]
pub fn get_sessions(store: State<'_, Mutex<SessionStore>>) -> Vec<Session> {
    let tmux_alive = client::is_tmux_alive();

    if !tmux_alive {
        // Try to start the server; if it fails, return empty
        if client::ensure_server().is_err() {
            let mut store = store.lock().unwrap();
            store.reconcile(&[], &HashMap::new(), &HashMap::new(), false);
            return store.to_sessions();
        }
    }

    let panes = client::list_panes(None).unwrap_or_default();

    // Get process table once for all panes
    let ps_output = client::get_process_table();

    let mut captures = HashMap::new();
    let mut claude_status = HashMap::new();

    for pane in &panes {
        let target = pane.target();
        if let Ok(captured) = client::capture_pane(&target) {
            captures.insert(target.clone(), captured);
        }
        claude_status.insert(target, client::is_claude_running(&ps_output, pane.pane_pid));
    }

    let mut store = store.lock().unwrap();
    store.reconcile(&panes, &captures, &claude_status, true);
    store.to_sessions()
}
