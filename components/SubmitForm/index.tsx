'use client';

import React, { useState, useRef, useCallback } from 'react';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export default function SubmitForm() {
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [contact, setContact] = useState('');
  const [content, setContent] = useState('');
  const [caption, setCaption] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File | null) => {
    setImageFile(file);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    if (!file) setCaption('');
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFile(e.target.files?.[0] || null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  }, [processFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');
    setErrorMsg('');

    const fd = new FormData();
    fd.append('title', title);
    fd.append('authorName', authorName);
    fd.append('contact', contact);
    fd.append('content', content);
    fd.append('featuredImageCaption', caption);
    if (imageFile) fd.append('featuredImage', imageFile);

    try {
      const res = await fetch('/api/submit', { method: 'POST', body: fd });
      if (res.ok) {
        setFormState('success');
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Something went wrong.');
        setFormState('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setFormState('error');
    }
  };

  if (formState === 'success') {
    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 'calc(100vh - 200px)', padding: '20px 30px 32px' }}>
        <h1 className="font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors mb-4" style={{ fontSize: 60, fontWeight: 400, lineHeight: 1 }}>
          Thank You
        </h1>
        <p className="font-copy text-[18px] text-text-muted leading-relaxed">
          Your submission has been received. Our editors will be in touch.
        </p>
      </div>
    );
  }

  const isSubmitting = formState === 'submitting';

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 30px 32px' }}>
      {/* Header — matches opinion page */}
      <div className="flex items-center mt-6 mb-10" style={{ gap: 24 }}>
        <h1 className="font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors" style={{ fontSize: 60, fontWeight: 400, lineHeight: 1 }}>
          Opinion Submission
        </h1>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 720 }}>

        {/* Title */}
        <div className="mb-8">
          <label className="block font-meta text-[13px] uppercase tracking-[0.08em] text-text-muted mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Article headline"
            className="w-full font-copy text-[28px] leading-[1.15] bg-transparent border-b border-rule text-text-main placeholder:text-text-muted/30 focus:outline-none focus:border-accent pb-2 transition-colors"
          />
        </div>

        {/* Featured Image — Payload-style upload */}
        <div style={{ marginBottom: 32 }}>
          <label className="block font-meta text-[13px] uppercase tracking-[0.08em] text-text-muted" style={{ marginBottom: 8 }}>
            Featured Image
          </label>

          {imagePreview ? (
            /* ── File selected: thumbnail + meta ── */
            <div
              style={{
                display: 'flex',
                borderRadius: 3,
                overflow: 'hidden',
              }}
              className="bg-[color-mix(in_srgb,var(--foreground)_5%,var(--background))]"
            >
              {/* Thumbnail */}
              <div style={{ width: 150, flexShrink: 0, position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>

              {/* File details */}
              <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="font-copy text-[14px] text-text-main" style={{ wordBreak: 'break-all' }}>
                  {imageFile?.name}
                </span>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Caption"
                  className="font-copy text-[13px] text-text-main placeholder:text-text-muted/40 focus:outline-none"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--rule-color)',
                    borderRadius: 3,
                    padding: '8px 15px',
                  }}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-copy text-[13px] text-text-main hover:text-accent transition-colors"
                    style={{
                      background: 'none',
                      border: '1px solid var(--rule-color)',
                      borderRadius: 3,
                      padding: '5px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => processFile(null)}
                    className="font-copy text-[13px] text-text-main hover:text-accent transition-colors"
                    style={{
                      background: 'none',
                      border: '1px solid var(--rule-color)',
                      borderRadius: 3,
                      padding: '5px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Empty: dropzone ── */
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: dragging
                  ? '1px dotted #45a049'
                  : '1px dotted var(--rule-color)',
                background: dragging
                  ? 'rgba(69,160,73,0.06)'
                  : 'transparent',
                borderRadius: 3,
                padding: '45px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: 'pointer',
                transition: 'all 100ms ease',
              }}
            >
              <span className="font-copy text-[17px] text-text-muted" style={{ opacity: 0.3 }}>
                Select a file or drag and drop a file here
              </span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
          />
        </div>

        {/* Content */}
        <div className="mb-8">
          <label className="block font-meta text-[13px] uppercase tracking-[0.08em] text-text-muted mb-2">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={18}
            placeholder="Write your article here…"
            className="w-full font-copy text-[17px] leading-[1.75] bg-transparent border border-rule text-text-main placeholder:text-text-muted/30 focus:outline-none focus:border-accent p-4 resize-y transition-colors"
          />
        </div>

        {/* Author Name */}
        <div className="mb-8">
          <label className="block font-meta text-[13px] uppercase tracking-[0.08em] text-text-muted mb-2">
            Author Name
          </label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            required
            placeholder="Your name"
            className="w-full font-copy text-[16px] bg-transparent border-b border-rule text-text-main placeholder:text-text-muted/30 focus:outline-none focus:border-accent pb-2 transition-colors"
          />
        </div>

        {/* Preferred Contact */}
        <div className="mb-10">
          <label className="block font-meta text-[13px] uppercase tracking-[0.08em] text-text-muted mb-2">
            Preferred Contact
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            placeholder="Email, phone, etc."
            className="w-full font-copy text-[16px] bg-transparent border-b border-rule text-text-main placeholder:text-text-muted/30 focus:outline-none focus:border-accent pb-2 transition-colors"
          />
        </div>

        {/* Error */}
        {formState === 'error' && (
          <p className="font-meta text-[13px] text-red-500 mb-4">{errorMsg}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="font-meta text-[16px] cursor-pointer disabled:opacity-50 submit-rainbow"
          style={{
            backgroundColor: '#D6001C',
            color: '#fff',
            padding: '10px 24px',
            border: 'none',
            borderRadius: 8,
            position: 'relative',
            zIndex: 0,
            overflow: 'hidden',
          }}
        >
          <span style={{ position: 'relative', zIndex: 2 }}>
            {isSubmitting ? 'Submitting…' : 'Submit'}
          </span>
        </button>

        <style>{`
          .submit-rainbow::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: linear-gradient(
              90deg,
              #ff2400, #e81d1d, #e8b71d, #e3e81d,
              #1de840, #1ddde8, #2b1de8, #dd00f3,
              #ff2400, #e81d1d, #e8b71d, #e3e81d,
              #1de840, #1ddde8, #2b1de8, #dd00f3
            );
            background-size: 200% 100%;
            z-index: 1;
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .submit-rainbow:hover:not(:disabled)::before {
            opacity: 1;
            animation: rainbow-slide 1.5s linear infinite;
          }
          @keyframes rainbow-slide {
            0%   { background-position: 0% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </form>
    </div>
  );
}
