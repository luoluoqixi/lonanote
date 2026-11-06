/// 单实例通知可能早于 Core 初始化；Ready 前只记账，不创建窗口。
#[derive(Default)]
pub struct LaunchRequests {
    is_ready: bool,
    pending: usize,
}

impl LaunchRequests {
    pub fn request(&mut self) -> usize {
        if self.is_ready {
            1
        } else {
            self.pending += 1;
            0
        }
    }

    pub fn ready(&mut self) -> usize {
        self.is_ready = true;
        std::mem::take(&mut self.pending)
    }
}
