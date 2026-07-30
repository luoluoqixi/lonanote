use serde::{Deserialize, Serialize};

#[derive(Default, Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum FileType {
    #[default]
    File,
    Directory,
}
