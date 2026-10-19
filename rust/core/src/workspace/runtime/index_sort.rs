use crate::workspace::{FileType, WorkspaceIndexEntry};
use std::cmp::Ordering;
pub fn compare(a: &WorkspaceIndexEntry, b: &WorkspaceIndexEntry) -> Ordering {
    let dir = |e: &WorkspaceIndexEntry| e.file_type == FileType::Directory;
    dir(b)
        .cmp(&dir(a))
        .then_with(|| match (a.last_modified_time, b.last_modified_time) {
            (Some(a), Some(b)) => b.cmp(&a),
            (Some(_), None) => Ordering::Less,
            (None, Some(_)) => Ordering::Greater,
            _ => Ordering::Equal,
        })
        .then_with(|| alphanumeric_sort::compare_str(a.path.as_str(), b.path.as_str()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::workspace::WorkspaceRelativePath;
    fn entry(path: &str, file_type: FileType, time: Option<u64>) -> WorkspaceIndexEntry {
        WorkspaceIndexEntry {
            path: WorkspaceRelativePath::parse(path).unwrap(),
            file_type,
            last_modified_time: time,
            create_time: None,
            size: None,
        }
    }
    #[test]
    fn directories_recent_then_natural_name_unknown_last() {
        let mut entries = vec![
            entry("missing.md", FileType::File, None),
            entry("n10.md", FileType::File, Some(10)),
            entry("n2.md", FileType::File, Some(10)),
            entry("new.md", FileType::File, Some(20)),
            entry("assets", FileType::Directory, None),
        ];
        entries.sort_by(compare);
        assert_eq!(
            entries.iter().map(|e| e.path.as_str()).collect::<Vec<_>>(),
            ["assets", "new.md", "n2.md", "n10.md", "missing.md"]
        );
    }
}
