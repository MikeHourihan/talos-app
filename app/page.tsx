'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './page.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const OPENING_MESSAGE = "Hey — questions about Ageless? Happy to walk you through it.";
const CHILIPIPER_LINK = "https://repeatmd.chilipiper.com/round-robin/default-ageless-demo";

function renderMessage(text: string) {
  // Replace any placeholder variations with real link
  let cleaned = text
    .replace(/\[ChiliPiper scheduling link\]/gi, CHILIPIPER_LINK)
    .replace(/\[ChiliPiper link\]/gi, CHILIPIPER_LINK)
    .replace(/\[scheduling link\]/gi, CHILIPIPER_LINK)
    .replace(/\[booking link\]/gi, CHILIPIPER_LINK)
    .replace(/\[link\]/gi, CHILIPIPER_LINK);

  // Replace any hallucinated scheduling URLs with the real one
  cleaned = cleaned.replace(
    /https?:\/\/(?:www\.)?(?:calendly|calendar|book|schedule|cal|meet)\.[^\s)]+/gi,
    CHILIPIPER_LINK
  );

  // Split on URLs and render them as clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = cleaned.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{color: 'var(--gold)', textDecoration: 'underline', wordBreak: 'break-all'}}>{part}</a>
      : part
  );
}

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const openChat = () => {
    setIsOpen(true);
    if (!hasOpened) {
      setHasOpened(true);
      setMessages([{ role: 'assistant', content: OPENING_MESSAGE }]);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error('API error');

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const current = accumulated;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: current };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: "Sorry, something went wrong. Try again in a moment.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.page}>
      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <span className={styles.logoWord}>Ageless</span>
            <span className={styles.logoAi}>AI</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#how-it-works">How it works</a>
            <a href="#verticals">Who it&apos;s for</a>
            <a href="#pricing">Pricing</a>
          </div>
          <button className={styles.navCta} onClick={openChat}>Talk to us</button>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroGrain} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>Patient Acquisition · Medical Aesthetics &amp; Wellness</div>
          <h1 className={styles.heroHeadline}>
            Show them<br />
            <em>their own face</em><br />
            with the result
          </h1>
          <p className={styles.heroSub}>
            Ageless puts your treatments on prospective patients&apos; faces — before they ever contact your practice. Qualified leads arrive pre-sold. Your front desk closes instead of convincing.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.ctaPrimary} onClick={openChat}>
              See how it works
            </button>
            <span className={styles.heroNote}>No demo request form. Just a real conversation.</span>
          </div>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.statItem}>
            <span className={styles.statNum}>8 in 10</span>
            <span className={styles.statLabel}>qualified patients never book — they can&apos;t picture themselves in the result</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statNum}>5 min</span>
            <span className={styles.statLabel}>conversion drops ~80% after 5 minutes of lead inactivity</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statNum}>7–10x</span>
            <span className={styles.statLabel}>touches needed to convert a wellness lead — most teams stop at 2</span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className={styles.section}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>The mechanism</p>
          <h2 className={styles.sectionHeadline}>A before-and-after on <em>their face</em></h2>
          <p className={styles.sectionSub}>
            The before-and-after has been the core conversion tool in aesthetics for forty years — because aspiration drives action. What&apos;s new is whose body the &ldquo;after&rdquo; lives on.
          </p>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>01</div>
              <h3>Prospect clicks your ad</h3>
              <p>They land on a visualization experience — not a contact form. They upload a selfie or see a real-time preview using their camera.</p>
            </div>
            <div className={styles.stepArrow}>→</div>
            <div className={styles.step}>
              <div className={styles.stepNum}>02</div>
              <h3>Their own face, with the result</h3>
              <p>Ageless renders the treatment on their specific face. Botox, filler, laser, body recomp — whatever you offer. Identity triggers commitment that no stranger&apos;s result ever does.</p>
            </div>
            <div className={styles.stepArrow}>→</div>
            <div className={styles.step}>
              <div className={styles.stepNum}>03</div>
              <h3>Scored, prioritized, ready to call</h3>
              <p>Leads arrive with intent scores. Your front desk knows which ones to call first — before spending 45 minutes finding out the hard way.</p>
            </div>
          </div>
        </div>
      </section>

      {/* VERTICALS */}
      <section id="verticals" className={styles.sectionAlt}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>Built for</p>
          <h2 className={styles.sectionHeadline}>Every aesthetic and wellness vertical</h2>
          <div className={styles.verticals}>
            {[
              { title: 'Med Spa', hook: 'Their own face is the only face that converts. Stop showing them strangers.' },
              { title: 'Cosmetic Dermatology', hook: 'Your medical patients are your warmest cosmetic prospects. They\'re sitting in your waiting room.' },
              { title: 'Plastic Surgery', hook: 'Most surgical patients start curious about Botox. Capture them before a competitor does.' },
              { title: 'Wellness & GLP-1', hook: 'A 6-month program is a commitment. They won\'t start without seeing themselves at the finish line.' },
            ].map(v => (
              <div key={v.title} className={styles.verticalCard}>
                <h3>{v.title}</h3>
                <p>{v.hook}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className={styles.section}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>Pricing</p>
          <h2 className={styles.sectionHeadline}>Usage-based. No contract. <em>Cancel anytime.</em></h2>
          <p className={styles.sectionSub}>
            Tiers run $499–$999/month depending on volume. Month-to-month — if it doesn&apos;t generate ROI, you cancel in-product.
          </p>
          <div className={styles.pricingCta}>
            <button className={styles.ctaPrimary} onClick={openChat}>
              Get the full breakdown
            </button>
            <p className={styles.pricingNote}>
              The numbers make more sense alongside the product. One conversation.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.logo}>
            <span className={styles.logoWord}>Ageless</span>
            <span className={styles.logoAi}>AI</span>
          </div>
          <p className={styles.footerSub}>A RepeatMD product</p>
        </div>
      </footer>

      {/* CHAT FAB */}
      {!isOpen && (
        <button className={styles.chatFab} onClick={openChat} aria-label="Open chat">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className={styles.chatWindow}>
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderLeft}>
              <img src="/chrysanthi.png" alt="Chrysanthi" className={styles.chatAvatar} />
              <div>
                <div className={styles.chatName}>Chrysanthi</div>
                <div className={styles.chatStatus}>
                  <span className={styles.statusDot} />
                  Ageless AI · Online
                </div>
              </div>
            </div>
            <button className={styles.chatClose} onClick={() => setIsOpen(false)} aria-label="Close chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className={styles.chatMessages}>
            {messages.map((msg, i) => (
              <div key={i} className={`${styles.msgRow} ${msg.role === 'user' ? styles.msgUser : styles.msgAssistant}`}>
                <div className={styles.msgBubble}>
                  {msg.content ? renderMessage(msg.content) : (isStreaming && i === messages.length - 1 ? (
                    <span className={styles.typingDots}>
                      <span /><span /><span />
                    </span>
                  ) : null)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.chatInputRow}>
            <textarea
              ref={inputRef}
              className={styles.chatInput}
              placeholder="Type a message…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isStreaming}
            />
            <button
              className={styles.chatSend}
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
