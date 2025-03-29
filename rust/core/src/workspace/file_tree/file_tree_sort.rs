use std::cmp::Ordering;

use serde::{Deserialize, Serialize};

use super::{FileNode, FileType};

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

fn file_tree_compare_name(a: &FileNode, b: &FileNode) -> Ordering {
    // 对比的路径永远不应该出现 "foo.txt/.." "/" 这样的路径, 所以直接unwrap
    let file_name_a = a.path.file_name().unwrap();
    let file_name_b = b.path.file_name().unwrap();
    alphanumeric_sort::compare_str(file_name_a, file_name_b)
}
fn file_tree_compare_modified_time(a: &FileNode, b: &FileNode) -> Ordering {
    let last_modified_a = &a.last_modified_time;
    let last_modified_b = &b.last_modified_time;
    if last_modified_a.is_none() && last_modified_b.is_none() {
        file_tree_compare_name(a, b)
    } else if last_modified_a.is_some() != last_modified_b.is_some() {
        if last_modified_a.is_some() {
            Ordering::Less
        } else {
            Ordering::Greater
        }
    } else {
        let time_a = last_modified_a.unwrap();
        let time_b = last_modified_b.unwrap();
        time_a.cmp(&time_b)
    }
}
fn file_tree_compare_create_time(a: &FileNode, b: &FileNode) -> Ordering {
    let create_a = &a.create_time;
    let create_b = &b.create_time;
    if create_a.is_none() && create_b.is_none() {
        file_tree_compare_name(a, b)
    } else if create_a.is_some() != create_b.is_some() {
        if create_a.is_some() {
            Ordering::Less
        } else {
            Ordering::Greater
        }
    } else {
        let time_a = create_a.unwrap();
        let time_b = create_b.unwrap();
        time_a.cmp(&time_b)
    }
}

pub fn file_tree_compare(a: &FileNode, b: &FileNode, sort_type: &FileTreeSortType) -> Ordering {
    let is_dir_a = a.file_type == FileType::Directory;
    let is_dir_b = b.file_type == FileType::Directory;
    if is_dir_a == is_dir_b {
        match sort_type {
            FileTreeSortType::Name => file_tree_compare_name(a, b),
            FileTreeSortType::NameRev => file_tree_compare_name(b, a),
            FileTreeSortType::LastModifiedTime => file_tree_compare_modified_time(a, b),
            FileTreeSortType::LastModifiedTimeRev => file_tree_compare_modified_time(b, a),
            FileTreeSortType::CreateTime => file_tree_compare_create_time(a, b),
            FileTreeSortType::CreateTimeRev => file_tree_compare_create_time(b, a),
        }
    } else if is_dir_a {
        Ordering::Less
    } else {
        Ordering::Greater
    }
}
