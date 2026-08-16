use std::cmp::Ordering;

use super::{FileNode, FileType};

fn file_tree_compare_name(a: &FileNode, b: &FileNode) -> Ordering {
    // 对比的路径永远不应该出现 "foo.txt/.." "/" 这样的路径, 所以直接unwrap
    let file_name_a = a.path.file_name().unwrap();
    let file_name_b = b.path.file_name().unwrap();
    alphanumeric_sort::compare_str(file_name_a, file_name_b)
}
fn file_tree_compare_modified_time(a: &FileNode, b: &FileNode) -> Ordering {
    match (a.last_modified_time, b.last_modified_time) {
        (Some(time_a), Some(time_b)) => time_b
            .cmp(&time_a)
            .then_with(|| file_tree_compare_name(a, b)),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (None, None) => file_tree_compare_name(a, b),
    }
}

pub fn file_tree_compare(a: &FileNode, b: &FileNode) -> Ordering {
    let is_dir_a = a.file_type == FileType::Directory;
    let is_dir_b = b.file_type == FileType::Directory;
    if is_dir_a == is_dir_b {
        file_tree_compare_modified_time(a, b)
    } else if is_dir_a {
        Ordering::Less
    } else {
        Ordering::Greater
    }
}

#[cfg(test)]
mod tests {
    use relative_path::RelativePathBuf;

    use super::*;

    fn node(path: &str, file_type: FileType, last_modified_time: Option<u64>) -> FileNode {
        FileNode {
            path: RelativePathBuf::from(path),
            file_type,
            last_modified_time,
            ..FileNode::default()
        }
    }

    #[test]
    fn sorts_by_recent_modified_time_and_puts_missing_time_last() {
        let mut nodes = vec![
            node("missing.md", FileType::File, None),
            node("older.md", FileType::File, Some(10)),
            node("newer.md", FileType::File, Some(20)),
        ];

        nodes.sort_by(file_tree_compare);

        assert_eq!(
            nodes
                .into_iter()
                .map(|node| node.path.to_string())
                .collect::<Vec<_>>(),
            ["newer.md", "older.md", "missing.md"]
        );
    }

    #[test]
    fn keeps_directories_before_files() {
        let mut nodes = [
            node("newer.md", FileType::File, Some(20)),
            node("assets", FileType::Directory, Some(10)),
        ];

        nodes.sort_by(file_tree_compare);

        assert_eq!(nodes[0].path.as_str(), "assets");
    }
}
