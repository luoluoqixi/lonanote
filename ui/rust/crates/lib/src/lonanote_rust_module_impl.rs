use craby::{prelude::*, throw};

use crate::ffi::bridging::*;
use crate::generated::*;

pub struct LonanoteRustModule {
    ctx: Context,
}

#[craby_module]
impl LonanoteRustModuleSpec for LonanoteRustModule {
    fn add(&mut self, a: Number, b: Number) -> Number {
        a + b
    }
    fn subtract(&mut self, a: Number, b: Number) -> Number {
        a - b
    }
    fn multiply(&mut self, a: Number, b: Number) -> Number {
        a * b
    }
    fn divide(&mut self, a: Number, b: Number) -> Number {
        a / b
    }
}
