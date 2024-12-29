pub trait BodyInner<T> {
    fn inner(&self) -> &T;
}

pub struct Json<T>(pub T)
where
    T: for<'de> serde::Deserialize<'de>;
impl<T> BodyInner<T> for Json<T>
where
    T: for<'de> serde::Deserialize<'de>,
{
    fn inner(&self) -> &T {
        &self.0
    }
}

pub struct NoArgsBody;
