use serde_json::{json, Value};

use super::support::{invoke_async_json, invoke_async_none, TestCommandEnv};

#[tokio::test(flavor = "current_thread")]
async fn settings_commands_roundtrip_and_reset_interval() {
    let _env = TestCommandEnv::new("settings-api").await;

    let settings = invoke_async_json::<Value>("settings.get_settings", None).await;
    assert_eq!(settings["autoSaveInterval"], 1.0);
    assert_eq!(settings["sourceMode"], false);

    invoke_async_none(
        "settings.set_settings",
        Some(json!({
            "firstSetup": false,
            "autoCheckUpdate": false,
            "autoOpenLastWorkspace": false,
            "autoSave": false,
            "autoSaveInterval": 9.5,
            "autoSaveFocusChange": false,
            "showLineNumber": true,
            "disableLineWrap": true,
            "sourceMode": true
        })),
    )
    .await;

    let updated = invoke_async_json::<Value>("settings.get_settings", None).await;
    assert_eq!(updated["autoSaveInterval"], 9.5);
    assert_eq!(updated["showLineNumber"], true);
    assert_eq!(updated["sourceMode"], true);

    invoke_async_none("settings.save_settings", None).await;
    invoke_async_none("settings.reset_settings_auto_save_interval", None).await;

    let reset = invoke_async_json::<Value>("settings.get_settings", None).await;
    assert_eq!(reset["autoSaveInterval"], 1.0);
    assert_eq!(reset["sourceMode"], true);
}
