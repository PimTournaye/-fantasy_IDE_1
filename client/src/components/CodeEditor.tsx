import { useEffect, useRef } from "react";
import { basicSetup, EditorView } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  language: "javascript" | "wgsl";
}

export function CodeEditor({ code, onChange, language }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Create the editor state with the appropriate language
    const extensions = [
      basicSetup,
      javascript(), // Use JavaScript syntax highlighting for both (WGSL is similar enough)
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        "&": {
          height: "100%",
          fontSize: "14px",
          fontFamily: '"Bianzhidai COLR", monospace',
          backgroundColor: "transparent",
        },
        ".cm-content": {
          padding: "20px",
          caretColor: "#ff69b4",
          color: "#ffffff",
          backgroundColor: "transparent",
        },
        ".cm-focused": {
          outline: "none",
        },
        ".cm-editor": {
          height: "100%",
          backgroundColor: "transparent",
        },
        ".cm-scroller": {
          fontFamily: '"Bianzhidai COLR", monospace',
          backgroundColor: "transparent",
        },
        ".cm-cursor": {
          borderLeftColor: "#ff69b4",
        },
        ".cm-selectionBackground": {
          backgroundColor: "#ff69b433",
        },
        ".cm-activeLine": {
          backgroundColor: "#ff69b411",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "#ff69b411",
        },
        ".cm-lineNumbers": {
          color: "#ff69b488",
        },
        ".cm-gutters": {
          backgroundColor: "transparent",
          borderRight: "1px solid #ff69b433",
        },
        ".cm-foldGutter": {
          color: "#ff69b488",
        },
        ".cm-searchMatch": {
          backgroundColor: "#ff69b433",
        },
        ".cm-searchMatch.cm-searchMatch-selected": {
          backgroundColor: "#ff69b466",
        },
        // Syntax highlighting for neon theme
        ".tok-comment": {
          color: "#888888",
          fontStyle: "italic",
        },
        ".tok-keyword": {
          color: "#ff69b4",
          fontWeight: "bold",
        },
        ".tok-string": {
          color: "#00ffff",
        },
        ".tok-number": {
          color: "#ffff00",
        },
        ".tok-operator": {
          color: "#ff69b4",
        },
        ".tok-function": {
          color: "#00ff00",
        },
        ".tok-variable": {
          color: "#ffffff",
        },
        ".tok-bracket": {
          color: "#ff69b4",
        },
        ".tok-punctuation": {
          color: "#ff69b4",
        },
        ".tok-meta": {
          color: "#ff69b4",
        },
        ".tok-link": {
          color: "#00ffff",
        },
        ".tok-invalid": {
          color: "#ff0000",
        },
      })
    ];

    const view = new EditorView({
      doc: code,
      extensions,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language]); // Recreate editor when language changes

  // Update editor content when code prop changes
  useEffect(() => {
    if (viewRef.current && viewRef.current.state.doc.toString() !== code) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: code,
        },
      });
    }
  }, [code]);

  return (
    <div 
      ref={editorRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative',
        backgroundColor: 'transparent'
      }} 
    />
  );
}