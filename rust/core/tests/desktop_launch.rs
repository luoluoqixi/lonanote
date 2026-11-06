#[path = "../../../ui/src-tauri/src/setup/launch_requests.rs"]
mod launch_requests;
use launch_requests::LaunchRequests;

#[test]
fn repeated_launches_wait_for_ready_and_each_create_one_window() {
    let mut requests = LaunchRequests::default();
    assert_eq!(requests.request(), 0);
    assert_eq!(requests.request(), 0);
    assert_eq!(requests.ready(), 2);
    assert_eq!(requests.ready(), 0);
    assert_eq!(requests.request(), 1);
    assert_eq!(requests.request(), 1);
}

#[test]
fn initial_startup_does_not_create_an_extra_window() {
    let mut requests = LaunchRequests::default();
    assert_eq!(requests.ready(), 0);
    assert_eq!(requests.request(), 1);
}

#[test]
fn concurrent_launches_and_ready_do_not_drop_requests() {
    let requests = std::sync::Arc::new(std::sync::Mutex::new(LaunchRequests::default()));
    let mut threads = Vec::new();
    for _ in 0..20 {
        let requests = requests.clone();
        threads.push(std::thread::spawn(move || {
            requests.lock().unwrap().request()
        }));
    }
    let initial = requests.lock().unwrap().ready();
    let later: usize = threads
        .into_iter()
        .map(|thread| thread.join().unwrap())
        .sum();
    assert_eq!(initial + later, 20);
}
