/// 保留正常向上翻转；翻转后顶部出界时优先贴底，菜单过高时允许顶部溢出。
pub(super) fn clamp_menu_top(top: i32, height: i32, work_top: i32, work_bottom: i32) -> i32 {
    let last_top = work_bottom.saturating_sub(height);
    if top < work_top || last_top < work_top {
        return last_top;
    }
    top.clamp(work_top, last_top)
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
