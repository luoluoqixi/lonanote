use craby::{prelude::*, throw};

use crate::ffi::bridging::*;
use crate::generated::*;

pub struct LonanoteUiCore {
    ctx: Context,
}

#[craby_module]
impl LonanoteUiCoreSpec for LonanoteUiCore {
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
