use super::super::{body::NoArgsBody, context::CommandContext, result::CommandResult};

use super::from_command_args::FromCommandArgs;

pub trait CommandHandler<T>: Send + Sync + 'static {
    fn call(&self, key: &str, ctx: CommandContext) -> CommandResult;
}

macro_rules! impl_command_handler {
    // 有参数
    ([$($arg:ident),*]) => {
        impl<F, $($arg),*> CommandHandler<($($arg),*)> for F
        where
            F: Fn($($arg),*) -> CommandResult + Send + Sync + 'static,
            $(
                $arg: FromCommandArgs,
            )*
        {
            fn call(&self, key: &str, ctx: CommandContext) -> CommandResult {
                (self)($(<$arg>::from_args(key, &ctx)?),*)
            }
        }
    };
    // 一个参数
    ($arg:ident) => {
        impl<F, $arg> CommandHandler<$arg> for F
        where
            F: Fn($arg) -> CommandResult + Send + Sync + 'static,
            $arg: FromCommandArgs,
        {
            fn call(&self, key: &str, ctx: CommandContext) -> CommandResult {
                (self)(<$arg>::from_args(key, &ctx)?)
            }
        }
    };
    // 无参
    () => {
        impl<F> CommandHandler<NoArgsBody> for F
        where
            F: Fn() -> CommandResult + Send + Sync + 'static,
        {
            fn call(&self, _: &str, _: CommandContext) -> CommandResult {
                (self)()
            }
        }
    };
}

impl_command_handler!();
impl_command_handler!(T);
impl_command_handler!([T, T1]);
impl_command_handler!([T, T1, T2]);
impl_command_handler!([T, T1, T2, T3]);
impl_command_handler!([T, T1, T2, T3, T4, T5]);
impl_command_handler!([T, T1, T2, T3, T4, T5, T6]);
impl_command_handler!([T, T1, T2, T3, T4, T5, T6, T7]);
impl_command_handler!([T, T1, T2, T3, T4, T5, T6, T7, T8]);
impl_command_handler!([T, T1, T2, T3, T4, T5, T6, T7, T8, T9]);
impl_command_handler!([T, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]);
