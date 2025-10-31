use crate::{
    path::{EDITOR_PROJECT_PATH, FLUTTER_PROJECT_PATH},
    run, utils,
};

pub async fn dev() -> anyhow::Result<()> {
    let dev_child = run::run_npm_dev(EDITOR_PROJECT_PATH.to_str().unwrap()).await;
    let flutter_child = run::run_flutter_dev(FLUTTER_PROJECT_PATH.to_str().unwrap()).await;

    let [dev_child, flutter_child] = utils::stop_error([dev_child, flutter_child], true).await?;

    let dev_future = dev_child.wait_with_output();
    let flutter_future = flutter_child.wait_with_output();

    let r = tokio::join!(dev_future, flutter_future);
    r.0?;
    r.1?;

    Ok(())
}
