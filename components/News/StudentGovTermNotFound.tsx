import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TransitionLink from "@/components/TransitionLink";
import { STUDENT_GOV, type StudentGovBody } from "./studentGov";

/** 404 for a term that doesn't exist or isn't covered, linking back to the one in session */
export default function StudentGovTermNotFound({ body }: { body: StudentGovBody }) {
  const meta = STUDENT_GOV[body];
  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      <div className="mx-auto max-w-[720px] px-4 pt-20 pb-24 text-center md:px-6">
        <p className="font-meta text-[12px] font-bold uppercase tracking-[0.16em] text-accent">{meta.title}</p>
        <h1 className="mt-3 font-copy text-[40px] font-semibold leading-[1.05] text-text-main">
          We don&rsquo;t have that {body === "senate" ? "Senate" : "year"} on the shelf
        </h1>
        <p className="mt-4 font-meta text-[15px] leading-[1.55] text-text-muted">
          It may be from before the digital archive begins, or the address may be mistyped.
        </p>
        <TransitionLink
          href={meta.href}
          className="mt-8 inline-flex min-h-11 items-center rounded-full bg-[#c8102e] px-6 font-meta text-[12px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#8a0b20]"
        >
          Go to the current {body === "senate" ? "Senate" : "Executive Board"}&nbsp;&rsaquo;
        </TransitionLink>
      </div>
      <Footer />
    </main>
  );
}
