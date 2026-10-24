import { getScrollbarMetrics, scrollTopFromThumb } from "./desktop_scrollbar_geometry";

/** 桌面 iframe 使用 DOM 滚动条，避开 WKWebView 多 iframe 的原生 overlay 绘制丢失。 */
export function createDesktopScrollbar(editorRoot: HTMLElement) {
  const track = document.createElement("div");
  track.className = "desktop-scrollbar";
  track.hidden = true;
  track.tabIndex = 0;
  track.setAttribute("role", "scrollbar");
  track.setAttribute("aria-label", "编辑器垂直滚动条");
  track.setAttribute("aria-controls", editorRoot.id);
  track.setAttribute("aria-orientation", "vertical");
  track.setAttribute("aria-valuemin", "0");
  const thumb = document.createElement("div");
  thumb.className = "desktop-scrollbar-thumb";
  track.append(thumb);
  document.body.append(track);
  let enabled = false;
  let frame = 0;
  let drag: { id: number; grab: number } | null = null;
  const scroller = () => document.scrollingElement ?? document.documentElement;
  const metrics = () => {
    const element = scroller();
    return getScrollbarMetrics(element.clientHeight, element.scrollHeight, element.scrollTop);
  };
  const render = () => {
    frame = 0;
    const value = enabled ? metrics() : null;
    track.hidden = !value;
    if (!value) return;
    thumb.style.height = `${value.thumbHeight}px`;
    thumb.style.transform = `translateY(${value.thumbTop}px)`;
    track.setAttribute("aria-valuemax", String(Math.round(value.maxScroll)));
    track.setAttribute("aria-valuenow", String(Math.round(scroller().scrollTop)));
  };
  const refresh = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };
  const moveThumb = (top: number) => {
    const value = metrics();
    if (!value) return;
    scroller().scrollTop = scrollTopFromThumb(top, value);
    refresh();
  };
  track.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const value = metrics();
    if (!value) return;
    event.preventDefault();
    const y = event.clientY - track.getBoundingClientRect().top;
    drag = {
      id: event.pointerId,
      grab: event.target === thumb ? y - value.thumbTop : value.thumbHeight / 2,
    };
    track.setPointerCapture(event.pointerId);
    track.classList.add("dragging");
    moveThumb(y - drag.grab);
  });
  track.addEventListener("pointermove", (event) => {
    if (drag?.id !== event.pointerId) return;
    moveThumb(event.clientY - track.getBoundingClientRect().top - drag.grab);
  });
  const stopDrag = () => {
    drag = null;
    track.classList.remove("dragging");
  };
  track.addEventListener("lostpointercapture", stopDrag);
  track.addEventListener("pointerup", stopDrag);
  track.addEventListener("pointercancel", stopDrag);
  window.addEventListener("blur", stopDrag);
  track.addEventListener("keydown", (event) => {
    const element = scroller();
    const offsets: Record<string, number> = {
      ArrowUp: -40,
      ArrowDown: 40,
      PageUp: -element.clientHeight,
      PageDown: element.clientHeight,
      Home: -element.scrollHeight,
      End: element.scrollHeight,
    };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    element.scrollTop += offsets[event.key];
    refresh();
  });
  window.addEventListener("scroll", refresh, { passive: true });
  window.addEventListener("resize", refresh);
  const observer = new ResizeObserver(refresh);
  observer.observe(editorRoot);
  observer.observe(document.documentElement);
  return {
    setEnabled(value: boolean) {
      enabled = value;
      document.documentElement.classList.toggle("desktop-scrollbar-enabled", value);
      refresh();
    },
  };
}
