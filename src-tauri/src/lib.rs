mod ai;
mod commands;
mod db;
mod models;

use tauri_plugin_sql::Builder as SqlBuilder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            SqlBuilder::default()
                .add_migrations(db::DB_URL, db::migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::list_models,
            commands::test_connection,
            commands::parse_job_offer,
            commands::parse_cv,
            commands::generate_cv,
            commands::generate_cover_letter,
            commands::generate_technical_test,
            commands::generate_test_from_topic,
            commands::analyze_ats,
            commands::evaluate_answer,
            commands::save_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
