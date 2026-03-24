'use client';

import React, { useState } from 'react';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export default function EventSubmitForm() {
  const [eventName, setEventName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/submit-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName, date, time, description, contactName, contactInfo }),
      });
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
          Your event has been submitted. Our editors will review it.
        </p>
      </div>
    );
  }

  const isSubmitting = formState === 'submitting';

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 30px 32px' }}>
      <div className="flex items-center mt-6 mb-10" style={{ gap: 24 }}>
        <h1 className="font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors" style={{ fontSize: 60, fontWeight: 400, lineHeight: 1 }}>
          Submit an Event
        </h1>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
        {/* Event Name */}
        <div className="mb-8">
          <label className="block font-meta text-[13px] uppercase tracking-[0.08em] text-text-muted mb-2">
            Event Name
          </label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            required
            placeholder="What's the event called?"
            className="w-full font-copy text-[28px] leading-[1.15] bg-transparent border-b border-rule text-text-main placeholder:text-text-muted/30 focus:outline-none focus:border-accent pb-2 transition-colors"
          />
        </div>

        {/* Date & Time row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="mb-8">
          <div>
            <label className="block font-meta text-[13px] uppercase tracking-[0.08em] text-text-muted mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full font-copy text-[16px] bg-transparent border-b border-rule text-text-main focus:outline-none focus:border-accent pb-2 transition-colors"
              style={{ colorScheme: 'auto' }}
            />
          </div>
          <div>
            <label className="block font-meta text-[13px] uppercase tracking-[0.08em] text-text-muted mb-2">
              Time
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              placeholder="e.g. 7:00 PM"
              className="w-full font-copy text-[16px] bg-transparent border-b border-rule text-text-main placeholder:text-text-muted/30 focus:outline-none focus:border-accent pb-2 transition-colors"
            />
          </div>
        </div>

        {/* Why The Poly Should Check It Out */}
        <div className="mb-8">
          <label className="block font-meta text-[13px] uppercase tracking-[0.08em] text-text-muted mb-2">
            Why Should The Poly Check It Out?
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={8}
            placeholder="Tell us about the event and why it matters…"
            className="w-full font-copy text-[17px] leading-[1.75] bg-transparent border border-rule text-text-main placeholder:text-text-muted/30 focus:outline-none focus:border-accent p-4 resize-y transition-colors"
          />
        </div>

        {/* Contact (optional) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="mb-10">
          <div>
            <label className="block font-meta text-[13px] uppercase tracking-[0.08em] text-text-muted mb-2">
              Contact Name <span className="normal-case text-text-muted/50">(optional)</span>
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Your name"
              className="w-full font-copy text-[16px] bg-transparent border-b border-rule text-text-main placeholder:text-text-muted/30 focus:outline-none focus:border-accent pb-2 transition-colors"
            />
          </div>
          <div>
            <label className="block font-meta text-[13px] uppercase tracking-[0.08em] text-text-muted mb-2">
              Contact Info <span className="normal-case text-text-muted/50">(optional)</span>
            </label>
            <input
              type="text"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Email, phone, etc."
              className="w-full font-copy text-[16px] bg-transparent border-b border-rule text-text-main placeholder:text-text-muted/30 focus:outline-none focus:border-accent pb-2 transition-colors"
            />
          </div>
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
            {isSubmitting ? 'Submitting…' : 'Submit Event'}
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
