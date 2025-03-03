import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { indentWithTab } from "@codemirror/commands";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  language: "javascript" | "wgsl";
}

export function CodeEditor({ code, onChange, language }: CodeEditorProps) {
  const editor = useRef<EditorView>();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    const startState = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        vscodeDark,
        language === "javascript" ? javascript() : [],
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      ],
    });

    editor.current = new EditorView({
      state: startState,
      parent: container.current,
    });

    return () => editor.current?.destroy();
  }, [container.current]);

  return (
    <div 
      ref={container} 
      className="h-full w-full overflow-auto bg-[#1E1E1E] text-white rounded-md"
    />
  );
}