use std::{fs::Metadata, path::Path, time::UNIX_EPOCH};

use ignore::{gitignore::GitignoreBuilder, WalkBuilder};
use relative_path::RelativePathBuf;
use serde::{Deserialize, Serialize};

use super::FileType;

#[derive(Default, Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub path: RelativePathBuf,
    pub file_type: FileType,
    pub last_modified_time: Option<u64>,
    pub create_time: Option<u64>,
    pub size: Option<u64>,
    pub file_count: usize,
    pub dir_count: usize,
    pub children: Option<Vec<FileNode>>,
}

impl FileNode {
    fn new_node_ignore(root: &Path, entry: ignore::DirEntry) -> Result<FileNode, String> {
        let metadata = entry
            .metadata()
            .map_err(|err| format!("error reading metadata: {}", err))?;
        let path = entry.path();

        Self::new_node(root, metadata, path)
    }
    fn new_node(root: &Path, metadata: Metadata, path: &Path) -> Result<FileNode, String> {
        let relative_path = RelativePathBuf::from_path(
            path.strip_prefix(root)
                .map_err(|err| format!("failed to create relative path: {:?}, {}", path, err))?,
        )
        .map_err(|err| {
            format!(
                "convert to RelativePathBuf Error: path: {} >> root: {}, error: {}",
                path.display(),
                root.display(),
                err
            )
        })?;

        let file_type = if metadata.is_dir() {
            FileType::Directory
        } else {
            FileType::File
        };

        let is_file = file_type == FileType::File;

        let last_modified_time = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|dur| dur.as_secs());

        let create_time = metadata
            .created()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|dur| dur.as_secs());

        let size = if is_file { Some(metadata.len()) } else { None };

        Ok(FileNode {
            path: relative_path,
            file_type,
            children: None,
            last_modified_time,
            create_time,
            size,
            file_count: 0,
            dir_count: 0,
        })
    }

    pub fn calc_count(&mut self) {
        if let Some(children) = self.children.as_mut() {
            let mut file_count = 0;
            let mut dir_count = 0;
            for child in children.iter_mut() {
                match child.file_type {
                    FileType::File => {
                        file_count += 1;
                        child.file_count = 0;
                        child.dir_count = 0;
                    }
                    FileType::Directory => {
                        dir_count += 1;
                        child.calc_count();
                        dir_count += child.dir_count;
                        file_count += child.file_count;
                    }
                }
            }
            self.file_count = file_count;
            self.dir_count = dir_count;
        } else {
            self.file_count = 0;
            self.dir_count = 0;
        }
    }

    pub fn from_path(
        root: &Path,
        follow_gitignore: bool,
        custom_ignore: String,
    ) -> Result<Self, String> {
        let mut ignore_builder = GitignoreBuilder::new(root);

        for rule in custom_ignore.lines() {
            if let Err(ignore_err) = ignore_builder.add_line(None, rule) {
                log::error!("custom ignore line parse error: {}, {}", ignore_err, rule);
            }
        }

        let custom_ignore = ignore_builder.build().unwrap();

        let mut dir_iter = WalkBuilder::new(root)
            .hidden(false)
            .git_ignore(follow_gitignore)
            .git_exclude(false)
            .require_git(false)
            .build();
        let root_entry = dir_iter.next();
        let root_node = match root_entry {
            Some(root_entry) => {
                let root_entry =
                    root_entry.map_err(|err| format!("error walking root directory: {}", err))?;
                let root_node = Self::new_node_ignore(root, root_entry)?;

                let mut stack: Vec<&FileNode> = vec![&root_node];

                for entry in dir_iter {
                    let entry = entry.map_err(|err| format!("error walking directory: {}", err))?;

                    let path = entry.path();
                    if custom_ignore.matched(path, path.is_dir()).is_ignore() {
                        // log::info!("ignore: {}", path.display());
                        continue;
                    }

                    let depth = entry.depth();
                    let node = Self::new_node_ignore(root, entry)?;

                    while stack.len() > depth {
                        stack.pop();
                    }

                    if let Some(&parent) = stack.last() {
                        // parent.children.get_or_insert_with(Vec::new).push(node);
                        let mut_parent =
                            unsafe { (parent as *const FileNode as *mut FileNode).as_mut() }
                                .unwrap();
                        mut_parent.children.get_or_insert_with(Vec::new).push(node);

                        let node_ref = parent.children.as_ref().unwrap().last().unwrap();
                        stack.push(node_ref);
                    }
                }

                Ok(root_node)
            }
            None => Err(format!("root node notfound: {}", root.display())),
        };

        let mut root_node = root_node?;
        // let start = std::time::Instant::now();
        root_node.calc_count();
        // log::info!("calc_count: {:?}ms", start.elapsed().as_millis());

        Ok(root_node)
    }
    // pub fn to_path_buf(&self, root: &Path) -> PathBuf {
    //     root.join(self.path.as_str())
    // }
}
