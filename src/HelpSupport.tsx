
import { useMemo, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";
import { errorMessage } from "./lib/useTable";
import {
  Search,
  HelpCircle,
  MessageCircle,
  Mail,
  BookOpen,
  Send,
  ChevronDown,
  Headphones,
  FileText,
  CreditCard,
  Users,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import "./HelpSupport.css";

const faqs = [
  {
    category: "Subscriptions",
    question: "How do I create a new subscription?",
    answer:
      "Open the Subscriptions section, select Create Subscription, choose a customer and plan, add the required products, and save your subscription.",
  },
  {
    category: "Subscriptions",
    question: "Can I pause or cancel a subscription?",
    answer:
      "Yes. Open the subscription details and use the available pause or cancellation actions. Your permissions may determine which actions are available.",
  },
  {
    category: "Invoices",
    question: "How are recurring invoices generated?",
    answer:
      "Recurring invoices are generated based on the billing cycle configured for each subscription. Review the due invoices before confirming them.",
  },
  {
    category: "Invoices",
    question: "How can I mark an invoice as paid?",
    answer:
      "Open the Payments section, record the payment against the relevant invoice, and verify the payment status.",
  },
  {
    category: "Payments",
    question: "Which payment methods can I record?",
    answer:
      "You can record supported payment methods such as UPI, card, bank transfer, and cash, depending on your workspace configuration.",
  },
  {
    category: "Customers",
    question: "How do I add a new customer?",
    answer:
      "Go to Customers, select Add Customer, enter the customer's details, and save the record.",
  },
  {
    category: "Account",
    question: "How can I update my profile information?",
    answer:
      "Open Settings and select the Profile tab to update your personal account information.",
  },
  {
    category: "Account",
    question: "Who can manage team members?",
    answer:
      "Only users with administrator permissions should be able to manage team members and their access.",
  },
];

const categories = [
  { name: "All", icon: BookOpen },
  { name: "Subscriptions", icon: RefreshCw },
  { name: "Invoices", icon: FileText },
  { name: "Payments", icon: CreditCard },
  { name: "Customers", icon: Users },
  { name: "Account", icon: HelpCircle },
];

function HelpSupport() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory =
        category === "All" || faq.category === category;

      const matchesSearch =
        faq.question.toLowerCase().includes(search.toLowerCase()) ||
        faq.answer.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      return;
    }

    setSending(true);
    setSendError("");
    // user_id is filled in by the database from the signed-in session
    const { error } = await supabase.from("support_tickets").insert({
      name: name.trim().slice(0, 120),
      email: email.trim().slice(0, 254),
      subject: subject.trim().slice(0, 200),
      message: message.trim().slice(0, 5000),
    });
    setSending(false);

    if (error) {
      setSendError(errorMessage(error));
      return;
    }

    setSubmitted(true);
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  };

  return (
    <div className="help-page">
      <header className="help-header">
        <div>
          <span className="help-eyebrow">SUPPORT CENTER</span>
          <h1>Help & Support</h1>
          <p>Find answers, explore guides, or get help with Brightloop.</p>
        </div>
      </header>

      <section className="help-hero">
        <div className="help-hero-content">
          <span className="help-hero-tag">
            <Headphones size={15} /> HOW CAN WE HELP?
          </span>
          <h2>We're here to help you.</h2>
          <p>
            Search our frequently asked questions or contact our support team
            for assistance.
          </p>

          <div className="help-search">
            <Search size={19} />
            <input
              type="text"
              placeholder="Search for answers..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCategory("All");
              }}
            />
          </div>
        </div>

        <div className="help-hero-art">
          <div className="help-art-circle">
            <MessageCircle size={68} />
          </div>
          <div className="help-art-bubble bubble-one">
            <CheckCircle size={18} />
          </div>
          <div className="help-art-bubble bubble-two">
            <HelpCircle size={20} />
          </div>
        </div>
      </section>

      <section className="help-quick-grid">
        <div className="help-quick-card">
          <div className="help-quick-icon">
            <BookOpen size={22} />
          </div>
          <h3>Knowledge Base</h3>
          <p>Find answers to common questions about using Brightloop.</p>
          <span>Browse FAQs below</span>
        </div>

        <div className="help-quick-card">
          <div className="help-quick-icon">
            <Mail size={22} />
          </div>
          <h3>Email Support</h3>
          <p>Send us your question and explain what you need help with.</p>
          <span>Use the support form below</span>
        </div>

        <div className="help-quick-card">
          <div className="help-quick-icon">
            <MessageCircle size={22} />
          </div>
          <h3>Support Requests</h3>
          <p>Share issues or suggestions related to your workspace.</p>
          <span>Submit a request below</span>
        </div>
      </section>

      <section className="help-faq-section">
        <div className="help-section-heading">
          <div>
            <span className="help-eyebrow">KNOWLEDGE BASE</span>
            <h2>Frequently Asked Questions</h2>
            <p>Quick answers to help you use Brightloop.</p>
          </div>
        </div>

        <div className="help-category-list">
          {categories.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`help-category ${
                  category === item.name ? "active" : ""
                }`}
                onClick={() => {
                  setCategory(item.name);
                  setOpenFaq(null);
                }}
              >
                <Icon size={16} />
                {item.name}
              </button>
            );
          })}
        </div>

        <div className="help-faq-list">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const originalIndex = faqs.indexOf(faq);
              const isOpen = openFaq === originalIndex;

              return (
                <div className="help-faq-item" key={faq.question}>
                  <button
                    className="help-faq-question"
                    onClick={() =>
                      setOpenFaq(isOpen ? null : originalIndex)
                    }
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      size={19}
                      className={isOpen ? "rotated" : ""}
                    />
                  </button>

                  {isOpen && (
                    <div className="help-faq-answer">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="help-no-results">
              <Search size={25} />
              <strong>No matching questions found</strong>
              <p>Try another search term or choose a different category.</p>
            </div>
          )}
        </div>
      </section>

      <section className="help-contact-section">
        <div className="help-contact-info">
          <span className="help-eyebrow">CONTACT US</span>
          <h2>Still need help?</h2>
          <p>
            Tell us what you're experiencing. Our support team can review your
            request once support submission is connected to a backend.
          </p>

          <div className="help-contact-detail">
            <div className="help-contact-icon">
              <Mail size={19} />
            </div>
            <div>
              <strong>Email Support</strong>
              <span>Contact your Brightloop administrator</span>
            </div>
          </div>

          <div className="help-contact-detail">
            <div className="help-contact-icon">
              <MessageCircle size={19} />
            </div>
            <div>
              <strong>Support Requests</strong>
              <span>Describe your issue using the form</span>
            </div>
          </div>
        </div>

        <form className="help-contact-form" onSubmit={handleSubmit}>
          <h3>Send us a message</h3>
          <p>Fill in the details below.</p>

          {submitted && (
            <div className="help-success">
              <CheckCircle size={17} />
              Request submitted. Our team will get back to you.
            </div>
          )}

          <div className="help-form-row">
            <label>
              Your Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                required
              />
            </label>

            <label>
              Email Address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                required
              />
            </label>
          </div>

          <label>
            Subject
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="What do you need help with?"
              required
            />
          </label>

          <label>
            Message
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe your issue..."
              rows={5}
              required
            />
          </label>

          {sendError && <p role="alert" style={{ color: "#b91c1c" }}>{sendError}</p>}
          <button type="submit" className="help-submit-btn" disabled={sending}>
            <Send size={17} />
            Submit Request
          </button>

          <span className="help-demo-note">
            Demo only — requests are not sent or stored yet.
          </span>
        </form>
      </section>
    </div>
  );
}

export default HelpSupport;
