import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FaqItem } from '../types';

const faqs: FaqItem[] = [
  {
    question: "Is VidVault free?",
    answer: "Yes, this tool is completely free. You can download as many videos as you want without any charges."
  },
  {
    question: "Is it safe and secure?",
    answer: "Yes, it is 100% safe. We do not store any personal data or video history. You can use it without worry."
  },
  {
    question: "Does it work on mobile?",
    answer: "Yes, this website works perfectly on Mobile (Android & iOS), Tablets, and Desktop browsers."
  },
  {
    question: "Is login required?",
    answer: "No, you can download videos directly without any login or signup. No account is needed."
  },
  {
    question: "Which formats are supported?",
    answer: "You can download videos in high-quality MP4, WEBM formats, and audio in MP3 format."
  }
];

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div id="faq" className="bg-transparent py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl divide-y divide-white/10">
          <h2 className="text-2xl font-bold leading-10 tracking-tight text-white mb-10 text-center">
            Frequently Asked Questions (FAQ)
          </h2>
          <dl className="mt-10 space-y-6 divide-y divide-white/10">
            {faqs.map((faq, index) => (
              <div key={index} className="pt-6 group">
                <dt>
                  <button
                    onClick={() => toggle(index)}
                    className="flex w-full items-start justify-between text-left text-white"
                  >
                    <span className="text-base font-semibold leading-7 group-hover:text-cyan-400 transition-colors">{faq.question}</span>
                    <span className="ml-6 flex h-7 items-center">
                      {openIndex === index ? (
                        <ChevronUp className="h-6 w-6 text-cyan-400" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-6 w-6 text-slate-400 group-hover:text-cyan-400" aria-hidden="true" />
                      )}
                    </span>
                  </button>
                </dt>
                {openIndex === index && (
                  <dd className="mt-2 pr-12 animate-fadeIn">
                    <p className="text-base leading-7 text-slate-400">{faq.answer}</p>
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default FAQ;