/// 保留正常向上翻转；翻转后顶部出界时优先贴底，菜单过高时允许顶部溢出。
pub(super) fn clamp_menu_top(top: i32, height: i32, work_top: i32, work_bottom: i32) -> i32 {
    let last_top = work_bottom.saturating_sub(height);
    if top < work_top || last_top < work_top {
        return last_top;
    }
    top.clamp(work_top, last_top)
}

/// 锚点已包含 trigger 边缘与 offset；按真实菜单尺寸计算次轴起点。
pub(super) fn aligned_menu_axis(anchor: i32, length: i32, align: &str) -> i32 {
    match align {
        "end" => anchor.saturating_sub(length),
        "center" => anchor.saturating_sub(length / 2),
        _ => anchor,
    }
}

pub(super) fn clamp_menu_left(left: i32, width: i32, work_left: i32, work_right: i32) -> i32 {
    left.clamp(work_left, work_right.saturating_sub(width).max(work_left))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_downward_and_upward_menus_in_place() {
        assert_eq!(clamp_menu_top(300, 400, 0, 960), 300);
        // 库已把鼠标下方放不下的菜单向上翻转，且顶部仍在工作区内。
        assert_eq!(clamp_menu_top(500, 400, 0, 960), 500);
        assert_eq!(clamp_menu_top(260, 700, 0, 960), 260);
    }

    #[test]
    fn end_alignment_opens_left_of_editor_more_anchor() {
        // 990 CSS px、150% WebView 比例：锚点在物理像素 1485；宽度来自原生菜单。
        assert_eq!(aligned_menu_axis(1485, 360, "end"), 1125);
        assert_eq!(aligned_menu_axis(1485, 360, "center"), 1305);
        assert_eq!(aligned_menu_axis(1485, 360, "start"), 1485);
    }

    #[test]
    fn horizontal_bounds_respect_negative_monitors_and_wide_menus() {
        assert_eq!(clamp_menu_left(1125, 360, 0, 1920), 1125);
        assert_eq!(clamp_menu_left(1800, 360, 0, 1920), 1560);
        assert_eq!(clamp_menu_left(-2100, 360, -1920, 0), -1920);
        assert_eq!(clamp_menu_left(-100, 2400, 0, 1920), 0);
    }

    #[test]
    fn aligns_bottom_when_neither_side_of_cursor_fits() {
        assert_eq!(clamp_menu_top(-400, 700, 0, 960), 260);
        assert_eq!(clamp_menu_top(500, 700, 0, 960), 260);
        assert_eq!(clamp_menu_top(-100, 960, 0, 960), 0);
    }

    #[test]
    fn respects_taskbar_and_negative_monitor_coordinates() {
        assert_eq!(clamp_menu_top(-400, 700, 48, 960), 260);
        assert_eq!(clamp_menu_top(-1500, 700, -1080, -40), -740);
        assert_eq!(clamp_menu_top(-500, 700, -1080, -40), -740);
    }

    #[test]
    fn allows_top_overflow_only_when_taller_than_entire_work_area() {
        assert_eq!(clamp_menu_top(-100, 1200, 0, 960), -240);
        assert_eq!(clamp_menu_top(200, 1200, 0, 960), -240);
        assert_eq!(clamp_menu_top(-1400, 1200, -1080, -40), -1240);
    }
}
