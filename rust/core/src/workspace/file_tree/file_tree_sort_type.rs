use serde::{Deserialize, Serialize};

#[derive(Default, Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum FileTreeSortType {
    #[default]
    Name,
    NameRev,

    LastModifiedTime,
    LastModifiedTimeRev,

    CreateTime,
    CreateTimeRev,
}
