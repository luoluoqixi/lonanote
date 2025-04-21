import clsx from 'clsx';
import {
  Ref,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';

import { useColorModeValue } from '@/components/provider/ColorModeProvider';
import { utils } from '@/utils';

import { MarkdownEditorProps, MarkdownEditorRef } from '../types';
import './MarkdownEditor.scss';
import { getI18n } from './i18n';

interface ThemeState {
  contentTheme: 'light' | 'dark';
  codeTheme: string;
}

const lightTheme: ThemeState = {
  contentTheme: 'light',
  codeTheme: 'github',
};
const darkTheme: ThemeState = {
  contentTheme: 'dark',
  codeTheme: 'github-dark-dimmed',
};
const cdn = 'libs/vditor';
const maxWidth = 768;
const MOBILE_WIDTH = 520;

const setEditorTheme = (editor: Vditor, theme: ThemeState) => {
  editor.setTheme('classic', theme.contentTheme, theme.codeTheme);
};

const getWrapPadding = (clientWidth: number) => {
  const minPadding = window.innerWidth <= MOBILE_WIDTH ? 10 : 35;
  return Math.max(minPadding, (clientWidth - maxWidth) / 2);
};

export default forwardRef((props: MarkdownEditorProps, ref: Ref<MarkdownEditorRef>) => {
  const {
    editorId,
    editMode,
    className,
    style,
    mediaRootPath,
    readOnly,
    onSave,
    onUpdateStateListener,
    onClickAnyLink,
    initValue,
  } = props;
  const theme = useColorModeValue<ThemeState>(lightTheme, darkTheme);

  const [updateReadOnlyState, setUpdateReadOnlyState] = useState<boolean>(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const editorPreviewRef = useRef<HTMLDivElement>(null);
  const editorPreviewParentRef = useRef<HTMLDivElement>(null);
  const editorPreviewWrapRef = useRef<HTMLDivElement>(null);
  const editor = useRef<Vditor | null>(null);

  const updateReadOnly = useCallback(
    () => setUpdateReadOnlyState(!updateReadOnlyState),
    [updateReadOnlyState],
  );

  useLayoutEffect(() => {
    if (!editorRef.current) return;
    onUpdateStateListener?.(null);
    const rootMediaPath = utils.getMediaPath(mediaRootPath);
    let vditor: Vditor | null = new Vditor(editorRef.current, {
      cache: {
        enable: false,
      },
      value: initValue || '',
      // 必须显示toolbar, 通过css隐藏, 否则切换模式查找不到dom
      // toolbar: [],
      i18n: getI18n(),
      cdn,
      theme: 'classic',
      mode: editMode as 'ir' | 'sv',
      tab: '  ',
      image: {
        isPreview: false,
      },
      link: {
        isOpen: false,
        click(bom) {
          const v = bom.innerHTML;
          if (v == null) return;
          if (onClickAnyLink) {
            onClickAnyLink(v);
          }
        },
      },
      preview: {
        maxWidth,
        markdown: {
          linkBase: rootMediaPath,
        },
      },
      counter: {
        enable: true,
        after(length) {
          onUpdateStateListener?.({
            charCount: length,
          });
        },
      },
      keydown(e) {
        const isCtrl = e.ctrlKey || e.metaKey;
        if (isCtrl && e.key === 's') {
          if (onSave && vditor) {
            onSave(vditor.getValue());
            e.preventDefault();
          }
        } else if (isCtrl && e.key === 'v') {
          navigator.clipboard.readText().then((val) => {
            vditor?.insertMD(val);
          });
          e.preventDefault();
        }
      },
      after: () => {
        // console.log('init finish', vditor);
        // 有可能是开发模式下第一次渲染还没初始化完成就被销毁了
        if (vditor != null) {
          setEditorTheme(vditor, theme);
          editor.current = vditor;
        } else {
          // 被销毁的 editor 初始化回调可能比第一次初始化的晚调用, 导致主题被还原
          if (editor.current != null) {
            setEditorTheme(editor.current, theme);
          }
        }
      },
    });
    console.log('vditor create', theme.contentTheme);
    return () => {
      if (vditor) {
        // fix https://github.com/Vanessa219/vditor/issues/1790
        // 防止 destroy 时将刚刚初始化好的 vditor 的 innerHTML 清理掉
        vditor.destroy();
        vditor.vditor.element = document.createElement('div');
        vditor = null;
      }
      editor.current = null;
      onUpdateStateListener?.(null);
    };
  }, [onSave, onUpdateStateListener, onClickAnyLink, initValue]);

  useEffect(() => {
    if (!editor.current) return;
    if (!editorRef.current || !editorPreviewRef.current || !editorPreviewWrapRef.current) return;
    {
      // 编辑器初始化完成时, vditor似乎会强行将editorRef的display设置为显示, 这里需要强行设置一下, React的状态更新会忽略
      editorRef.current.style.display = readOnly ? 'none' : 'flex';
      editorPreviewWrapRef.current.style.display = readOnly ? 'flex' : 'none';
    }
    setEditorTheme(editor.current, theme);
    if (readOnly) {
      console.log(theme);
      Vditor.preview(editorPreviewRef.current, editor.current.getValue(), {
        mode: theme.contentTheme,
        theme: {
          current: theme.contentTheme,
        },
        hljs: {
          style: theme.codeTheme,
        },
        i18n: getI18n(),
        cdn,
      });
      updatePadding(editorPreviewRef.current);
    }
  }, [readOnly, theme, updateReadOnlyState]);

  useEffect(() => {
    if (!editor.current) return;
    document.querySelector(`[data-mode="${editMode}"]`)?.dispatchEvent(new CustomEvent('click'));
    // console.log(editMode, document.querySelector(`[data-mode="${editMode}"]`));
  }, [editMode]);

  useEffect(() => {
    if (!editor.current) return;
    setEditorTheme(editor.current, theme);
  }, [theme]);

  useImperativeHandle(ref, () => ({
    getValue() {
      return editor.current?.getValue();
    },
    setValue(content) {
      try {
        editor.current?.setValue(content || '', true);
        updateReadOnly();
      } catch (e) {
        console.error('setValue error:', e);
      }
    },
  }));

  const updatePadding = (e: Element) => {
    const { clientWidth } = e;
    const padding = getWrapPadding(clientWidth);
    if (editorPreviewRef.current) {
      const p = `${padding}px`;
      editorPreviewRef.current.style.paddingLeft = p;
      editorPreviewRef.current.style.paddingRight = p;
    }
  };

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updatePadding(entry.target);
      }
    });
    if (editorPreviewParentRef.current) {
      observer.observe(editorPreviewParentRef.current);
    }
    return () => {
      if (editorPreviewParentRef.current) {
        observer.unobserve(editorPreviewParentRef.current);
      }
    };
  }, [editorPreviewParentRef]);

  return (
    <>
      <div
        id={editorId}
        ref={editorRef}
        className={className}
        style={{ display: readOnly ? 'none' : 'flex', ...style }}
      />
      <div
        ref={editorPreviewWrapRef}
        className={clsx('md-vditor-preview-wrap', className)}
        style={{
          display: readOnly ? 'flex' : 'none',
          ...style,
        }}
      >
        <div ref={editorPreviewParentRef} className="md-vditor-preview-content">
          <div ref={editorPreviewRef} />
        </div>
      </div>
    </>
  );
});
