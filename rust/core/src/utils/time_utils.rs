use std::time::{SystemTime, UNIX_EPOCH};

pub fn get_now_timestamp() -> u64 {
    let now = SystemTime::now();
    now.duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs()
}
