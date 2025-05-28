use std::{
    borrow::Cow,
    ffi::OsStr,
    hash::{Hash, Hasher},
    path::PathBuf,
};

use serde::{
    de::{self, Visitor},
    Deserialize, Deserializer, Serialize, Serializer,
};

use crate::config::app_path::get_root_dir;

#[derive(Debug, Clone, Default)]
pub struct WorkspacePath {
    pub path: PathBuf,
}

impl WorkspacePath {
    pub fn to_path_buf(&self) -> PathBuf {
        if let Some(root_dir) = get_root_dir() {
            PathBuf::from(root_dir).join(&self.path)
        } else {
            self.path.clone()
        }
    }

    pub fn to_path_buf_cow<'a>(&'a self) -> Cow<'a, std::path::Path> {
        if let Some(root_dir) = get_root_dir() {
            Cow::Owned(PathBuf::from(root_dir).join(&self.path))
        } else {
            Cow::Borrowed(self.path.as_path())
        }
    }

    pub fn exists(&self) -> bool {
        let path = self.to_path_buf_cow();
        path.exists()
    }
}

impl<T: ?Sized + AsRef<OsStr>> From<&T> for WorkspacePath {
    #[inline]
    fn from(s: &T) -> WorkspacePath {
        WorkspacePath {
            path: PathBuf::from(s),
        }
    }
}

impl PartialEq for WorkspacePath {
    fn eq(&self, other: &Self) -> bool {
        self.path == other.path
    }
}

impl Eq for WorkspacePath {}

impl Hash for WorkspacePath {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.path.hash(state);
    }
}

impl Serialize for WorkspacePath {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(
            self.path
                .to_str()
                .ok_or_else(|| serde::ser::Error::custom("Invalid path string"))?,
        )
    }
}

impl<'de> Deserialize<'de> for WorkspacePath {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct PathVisitor;

        impl<'de> Visitor<'de> for PathVisitor {
            type Value = WorkspacePath;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("a string representing a path")
            }

            fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                Ok(WorkspacePath {
                    path: PathBuf::from(value),
                })
            }
        }

        deserializer.deserialize_str(PathVisitor)
    }
}
