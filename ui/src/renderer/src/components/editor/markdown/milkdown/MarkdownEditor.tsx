// import { commandsCtx, editorViewCtx, editorViewOptionsCtx } from '@milkdown/core';
// import { Crepe } from '@milkdown/crepe';
// import '@milkdown/crepe/theme/common/style.css';
// import '@milkdown/crepe/theme/frame.css';
// import { $command, $useKeymap } from '@milkdown/utils';
// import {
//   CSSProperties,
//   Ref,
//   forwardRef,
//   useEffect,
//   useImperativeHandle,
//   useLayoutEffect,
//   useRef,
//   useState,
// } from 'react';

// import './MarkdownEditor.scss';

// export interface MarkdownEditorRef {
//   getMarkdown: () => string | undefined;
// }

// export interface UpdateState {
//   charCount: number;
//   rowIndex?: number;
//   colIndex?: number;
// }

// export interface CodeMirrorEditorProps {
//   fileName: string;
//   style?: CSSProperties;
//   className?: string;
//   readOnly?: boolean;
//   getInitContent?: () => string;
//   onSave?: (content: string) => void;
//   onUpdateListener?: (state: UpdateState | null) => void;
// }

// // function getBlockLineNumber(state: EditorState) {
// //   const $from = state.selection.$from;
// //   let depth = $from.depth;
// //   while (depth > 0 && !$from.node(depth).type.isBlock) {
// //     depth--;
// //   }
// //   const blockPos = $from.start(depth);
// //   const resolvedPos = state.doc.resolve(blockPos);
// //   return resolvedPos.index(0) + 1;
// // }

// export default forwardRef((props: CodeMirrorEditorProps, ref: Ref<MarkdownEditorRef>) => {
//   const { className, style, fileName, readOnly, getInitContent, onSave, onUpdateListener } = props;
//   const editorRef = useRef<HTMLDivElement>(null);
//   const [loading, setLoading] = useState(false);
//   const [getCrepe, updateCrepe] = useState<(() => Crepe | undefined) | null>(null);

//   useLayoutEffect(() => {
//     if (!editorRef.current) return;
//     onUpdateListener?.(null);
//     setLoading(true);
//     const defaultValue = getInitContent?.();
//     let crepe: Crepe | undefined = new Crepe({
//       root: editorRef.current,
//       defaultValue,
//       features: {
//         placeholder: false,
//       },
//       featureConfigs: {
//         [Crepe.Feature.ImageBlock]: {
//           proxyDomURL: (originalURL: string) => {
//             console.log(originalURL);
//             return originalURL;
//           },
//         },
//         [Crepe.Feature.BlockEdit]: {
//           handleAddIcon: undefined,
//         },
//       },
//     });

//     const saveCommand = $command('saveCommand', () => () => {
//       return () => {
//         if (!crepe) return true;
//         const mdText = crepe.getMarkdown();
//         // console.log(mdText);
//         onSave?.(mdText);
//         return true;
//       };
//     });
//     const saveKeyMap = $useKeymap('saveKeymap', {
//       saveDescription: {
//         shortcuts: 'Mod-s',
//         command: (ctx) => {
//           const commands = ctx.get(commandsCtx);
//           return () => commands.call(saveCommand.key);
//         },
//       },
//     });
//     crepe.editor.use([saveCommand, saveKeyMap].flat());

//     crepe.editor.config((ctx) => {
//       ctx.update(editorViewOptionsCtx, (prev) => ({
//         ...prev,
//         attributes: {
//           ...prev.attributes,
//           spellcheck: 'false',
//         },
//         // handleDOMEvents: {
//         //   pointerup: (view) => {
//         //     const line = getBlockLineNumber(view.state);
//         //     console.log(line);
//         //   },
//         // },
//       }));
//     });
//     crepe.on((listener) => {
//       listener.updated((ctx) => {
//         if (!crepe) return;
//         const view = ctx.get(editorViewCtx);
//         onUpdateListener?.({ charCount: view.state.doc.content.size });
//       });
//       listener.mounted((ctx) => {
//         if (!crepe) return;
//         const view = ctx.get(editorViewCtx);
//         onUpdateListener?.({ charCount: view.state.doc.content.size });
//       });
//     });
//     crepe
//       .setReadonly(readOnly || false)
//       .create()
//       .then(() => {
//         // 上一个编辑器销毁时可能还会还会短暂占用dom导致鼠标在div上move时有一些事件报错, 延迟一点点时间解决
//         setTimeout(() => setLoading(false), 50);
//       });
//     updateCrepe(() => () => crepe);
//     return () => {
//       updateCrepe(null);
//       if (crepe) {
//         crepe.destroy();
//         crepe = undefined;
//       }
//     };
//   }, [fileName, onSave, onUpdateListener]);

//   useEffect(() => {
//     if (!getCrepe) return;
//     const crepe = getCrepe();
//     if (crepe) {
//       crepe.setReadonly(readOnly || false);
//     }
//   }, [readOnly]);

//   useImperativeHandle(ref, () => ({
//     getMarkdown() {
//       return getCrepe?.()?.getMarkdown();
//     },
//   }));

//   return (
//     <div
//       style={{
//         display: loading ? 'none' : undefined,
//         ...style,
//       }}
//       className={className}
//       ref={editorRef}
//     />
//   );
// });
