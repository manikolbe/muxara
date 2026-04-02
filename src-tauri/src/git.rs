use std::path::Path;
use std::process::Command;

/// Sanitize a name for use as a git worktree name (becomes a directory name).
/// Replaces any character that isn't alphanumeric, hyphen, or underscore with a hyphen.
/// Collapses consecutive hyphens and trims leading/trailing hyphens.
pub fn sanitize_worktree_name(name: &str) -> String {
    let sanitized: String = name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect();
    // Collapse consecutive hyphens and trim
    let mut result = String::new();
    let mut prev_hyphen = true; // treat start as hyphen to trim leading
    for c in sanitized.chars() {
        if c == '-' {
            if !prev_hyphen {
                result.push(c);
            }
            prev_hyphen = true;
        } else {
            result.push(c);
            prev_hyphen = false;
        }
    }
    result.trim_end_matches('-').to_string()
}

/// Check whether a directory is inside a git repository.
pub fn is_git_repo(path: &str) -> bool {
    Command::new("git")
        .args(["-C", path, "rev-parse", "--is-inside-work-tree"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Return the current branch name for a directory, or None if not a git repo
/// or in detached HEAD state.
pub fn detect_branch(path: &str) -> Option<String> {
    let output = Command::new("git")
        .args(["-C", path, "rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if branch.is_empty() || branch == "HEAD" {
        None
    } else {
        Some(branch)
    }
}

/// Check whether a directory is a git worktree (as opposed to the main checkout).
/// In a worktree, `.git` is a file containing a `gitdir:` pointer rather than a directory.
pub fn is_worktree(path: &str) -> bool {
    let git_path = Path::new(path).join(".git");
    git_path.is_file()
}

/// Check whether a git working tree has uncommitted changes (staged or unstaged)
/// or untracked files.
pub fn has_uncommitted_changes(path: &str) -> bool {
    Command::new("git")
        .args(["-C", path, "status", "--porcelain"])
        .output()
        .map(|o| o.status.success() && !o.stdout.is_empty())
        .unwrap_or(false)
}

/// Remove a git worktree. Finds the parent repo from the worktree's `.git` file
/// and runs `git worktree remove <path>`.
pub fn remove_worktree(worktree_path: &str) -> Result<(), String> {
    let output = Command::new("git")
        .args(["-C", worktree_path, "worktree", "remove", worktree_path])
        .output()
        .map_err(|e| format!("Failed to run git worktree remove: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(format!("Failed to remove worktree: {}", stderr))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_sanitize_worktree_name_simple() {
        assert_eq!(sanitize_worktree_name("my-session"), "my-session");
        assert_eq!(sanitize_worktree_name("feature_123"), "feature_123");
    }

    #[test]
    fn test_sanitize_worktree_name_spaces() {
        assert_eq!(sanitize_worktree_name("my cool session"), "my-cool-session");
    }

    #[test]
    fn test_sanitize_worktree_name_special_chars() {
        assert_eq!(sanitize_worktree_name("feat/add-auth"), "feat-add-auth");
        assert_eq!(sanitize_worktree_name("fix: bug #42"), "fix-bug-42");
        assert_eq!(sanitize_worktree_name("hello@world!"), "hello-world");
    }

    #[test]
    fn test_sanitize_worktree_name_consecutive_hyphens() {
        assert_eq!(sanitize_worktree_name("a - - b"), "a-b");
        assert_eq!(sanitize_worktree_name("---leading"), "leading");
        assert_eq!(sanitize_worktree_name("trailing---"), "trailing");
    }

    #[test]
    fn test_is_git_repo_on_real_repo() {
        // The muxara repo itself is a git repo
        let repo_root = env!("CARGO_MANIFEST_DIR");
        let parent = Path::new(repo_root).parent().unwrap().to_str().unwrap();
        assert!(is_git_repo(parent));
    }

    #[test]
    fn test_is_git_repo_non_git_dir() {
        let dir = std::env::temp_dir().join("muxara_test_not_git");
        let _ = fs::create_dir_all(&dir);
        assert!(!is_git_repo(dir.to_str().unwrap()));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_detect_branch_on_real_repo() {
        let repo_root = env!("CARGO_MANIFEST_DIR");
        let parent = Path::new(repo_root).parent().unwrap().to_str().unwrap();
        let branch = detect_branch(parent);
        assert!(branch.is_some());
    }

    #[test]
    fn test_detect_branch_non_git_dir() {
        let dir = std::env::temp_dir().join("muxara_test_no_branch");
        let _ = fs::create_dir_all(&dir);
        assert!(detect_branch(dir.to_str().unwrap()).is_none());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_is_worktree_main_checkout() {
        // The muxara repo itself is a main checkout, not a worktree
        let repo_root = env!("CARGO_MANIFEST_DIR");
        let parent = Path::new(repo_root).parent().unwrap().to_str().unwrap();
        assert!(!is_worktree(parent));
    }

    #[test]
    fn test_is_worktree_with_git_file() {
        let dir = std::env::temp_dir().join("muxara_test_worktree_detect");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        // Simulate a worktree: .git is a file, not a directory
        fs::write(dir.join(".git"), "gitdir: /some/repo/.git/worktrees/test").unwrap();
        assert!(is_worktree(dir.to_str().unwrap()));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_is_worktree_no_git() {
        let dir = std::env::temp_dir().join("muxara_test_worktree_none");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        assert!(!is_worktree(dir.to_str().unwrap()));
        let _ = fs::remove_dir_all(&dir);
    }
}
