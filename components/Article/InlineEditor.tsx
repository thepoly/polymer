'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import './inline-editor.css';

type SimpleField = 'title' | 'subdeck' | 'kicker' | 'imageCaption';
type IndexedField = 'paragraph' | 'upload-caption';
type AnyField = SimpleField | IndexedField;

type LexicalTextNode = {
  type: 'text';
  text: string;
  format: number;
  version: number;
};

type LexicalContentNode = {
  type: string;
  children?: LexicalContentNode[];
  fields?: Record<string, unknown>;
  [key: string]: unknown;
};

type LexicalContent = {
  root: {
    type: string;
    children: LexicalContentNode[];
    [key: string]: unknown;
  };
};

/** Parse an edited paragraph's innerHTML back into Lexical text children, preserving bold/italic/etc. */
function htmlToLexicalChildren(element: HTMLElement): LexicalTextNode[] {
  const result: LexicalTextNode[] = [];

  function walk(node: Node, format: number) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) result.push({ type: 'text', text, format, version: 1 });
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName.toLowerCase();
      let newFormat = format;
      if (tag === 'strong' || tag === 'b') newFormat |= 1;
      if (tag === 'em' || tag === 'i') newFormat |= 2;
      if (tag === 's' || tag === 'del') newFormat |= 4;
      if (tag === 'u') newFormat |= 8;
      if (tag === 'code') newFormat |= 32;
      for (const child of Array.from(node.childNodes)) {
        walk(child, newFormat);
      }
    }
  }

  walk(element, 0);
  return result;
}

/** Build a storage key for an editable field element */
function fieldKey(el: HTMLElement): string {
  const field = el.dataset.ieField!;
  const idx = el.dataset.ieIndex;
  return idx !== undefined ? `${field}-${idx}` : field;
}

export function InlineEditor({ articleId }: { articleId: number }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stores original textContent (for simple fields) or innerHTML (for paragraphs)
  const originalsRef = useRef<Map<string, string>>(new Map());

  const getFieldElements = useCallback(() => {
    return document.querySelectorAll<HTMLElement>('[data-ie-field]');
  }, []);

  const enterEditMode = useCallback(() => {
    originalsRef.current.clear();
    getFieldElements().forEach((el) => {
      const field = el.dataset.ieField as AnyField;
      const key = fieldKey(el);
      // Store innerHTML for paragraphs (to preserve formatting), textContent for simple fields
      originalsRef.current.set(
        key,
        field === 'paragraph' ? el.innerHTML : (el.textContent || ''),
      );
      el.contentEditable = 'true';
      el.classList.add('ie-editable');
    });
    setEditing(true);
    setError(null);
  }, [getFieldElements]);

  const exitEditMode = useCallback(() => {
    getFieldElements().forEach((el) => {
      el.contentEditable = 'false';
      el.classList.remove('ie-editable');
    });
    setEditing(false);
  }, [getFieldElements]);

  const handleCancel = useCallback(() => {
    getFieldElements().forEach((el) => {
      const field = el.dataset.ieField as AnyField;
      const key = fieldKey(el);
      const original = originalsRef.current.get(key);
      if (original !== undefined) {
        if (field === 'paragraph') {
          el.innerHTML = original;
        } else {
          el.textContent = original;
        }
      }
    });
    exitEditMode();
  }, [getFieldElements, exitEditMode]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      // Collect simple field changes
      const simpleChanges: Record<string, string> = {};
      // Collect indexed changes: { paragraph: { 3: element, 7: element }, 'upload-caption': { 5: element } }
      const paragraphChanges = new Map<number, HTMLElement>();
      const uploadCaptionChanges = new Map<number, string>();

      getFieldElements().forEach((el) => {
        const field = el.dataset.ieField as AnyField;
        const key = fieldKey(el);
        const original = originalsRef.current.get(key) || '';

        if (field === 'paragraph') {
          if (el.innerHTML !== original) {
            const idx = parseInt(el.dataset.ieIndex!, 10);
            paragraphChanges.set(idx, el);
          }
        } else if (field === 'upload-caption') {
          const current = el.textContent || '';
          if (current !== original) {
            const idx = parseInt(el.dataset.ieIndex!, 10);
            uploadCaptionChanges.set(idx, current);
          }
        } else {
          const current = el.textContent || '';
          if (current !== original) {
            simpleChanges[field] = current;
          }
        }
      });

      const hasContentChanges = paragraphChanges.size > 0 || uploadCaptionChanges.size > 0;
      const hasSimpleChanges = Object.keys(simpleChanges).length > 0;

      if (!hasContentChanges && !hasSimpleChanges) {
        exitEditMode();
        return;
      }

      // Build the request body
      const body: Record<string, unknown> = { articleId, ...simpleChanges };

      // If we have paragraph or upload-caption changes, fetch current content and rebuild
      if (hasContentChanges) {
        const contentRes = await fetch(`/api/inline-edit?id=${articleId}`);
        if (!contentRes.ok) {
          throw new Error(`Failed to fetch content (${contentRes.status})`);
        }
        const articleData = await contentRes.json();
        const content = articleData.content as LexicalContent;

        // Apply paragraph changes
        for (const [idx, el] of paragraphChanges) {
          const node = content.root.children[idx];
          if (node && node.type === 'paragraph') {
            node.children = htmlToLexicalChildren(el);
          }
        }

        // Apply upload-caption changes
        for (const [idx, newCaption] of uploadCaptionChanges) {
          const node = content.root.children[idx];
          if (node && node.type === 'upload') {
            if (!node.fields) node.fields = {};
            node.fields.caption = newCaption;
          }
        }

        body.content = content;
      }

      const res = await fetch('/api/inline-edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }

      // Update originals to new values
      getFieldElements().forEach((el) => {
        const field = el.dataset.ieField as AnyField;
        const key = fieldKey(el);
        originalsRef.current.set(
          key,
          field === 'paragraph' ? el.innerHTML : (el.textContent || ''),
        );
      });
      exitEditMode();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [articleId, getFieldElements, exitEditMode]);

  // Escape key cancels
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editing) {
        e.preventDefault();
        handleCancel();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [editing, handleCancel]);

  return (
    <div className={`ie-toolbar ${editing ? 'ie-toolbar-editing' : ''}`}>
      {error && <span className="ie-error" title={error}>{error}</span>}
      {editing ? (
        <>
          <button className="ie-btn ie-btn-cancel" onClick={handleCancel} disabled={saving}>
            Cancel
          </button>
          <button className="ie-btn ie-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </>
      ) : (
        <>
          <a className="ie-btn ie-btn-admin" href={`/newsroom/collections/articles/${articleId}`}>
            CMS
          </a>
          <button className="ie-btn ie-btn-edit" onClick={enterEditMode}>
            Edit
          </button>
        </>
      )}
    </div>
  );
}
