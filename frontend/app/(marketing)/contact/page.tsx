"use client";

import { useState } from "react";
import { Mail, Phone, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import DarkNavigation from "@/components/landing/DarkNavigation";
import DarkFooter from "@/components/landing/DarkFooter";
import DarkScrollReveal from "@/components/landing/DarkScrollReveal";

const contactMethods = [
  {
    icon: Mail,
    title: "Email",
    description: "Send us an email anytime",
    value: "hello@omnidial.io",
    href: "mailto:hello@omnidial.io",
  },
  {
    icon: MessageSquare,
    title: "Live Chat",
    description: "Available 9am-6pm EST",
    value: "Start a chat",
    href: "#",
  },
  {
    icon: Phone,
    title: "Phone",
    description: "Mon-Fri, 9am-6pm EST",
    value: "+1 (555) 123-4567",
    href: "tel:+15551234567",
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
    type: "general",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      <DarkNavigation />

      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          {/* Hero */}
          <section className="py-16 sm:py-20 md:py-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight mb-4 heading-display">
                  Get in touch
                </h1>
                <p className="text-white/50 text-lg max-w-2xl mx-auto">
                  Have questions about OmniDial? We&apos;d love to hear from you.
                </p>
              </DarkScrollReveal>
            </div>
          </section>

          {/* Contact methods */}
          <section className="pb-12 sm:pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
                {contactMethods.map((method, i) => (
                  <DarkScrollReveal key={method.title} delay={i * 100}>
                    <a
                      href={method.href}
                      className="block p-6 bg-[#111111] rounded-2xl border border-white/5 hover:border-white/10 transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white group-hover:text-black transition-colors">
                        <method.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-white mb-1">{method.title}</h3>
                      <p className="text-white/40 text-sm mb-2">{method.description}</p>
                      <p className="text-white/70 text-sm">{method.value}</p>
                    </a>
                  </DarkScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Contact form */}
          <section className="py-12 sm:py-16 md:py-20 border-t border-white/5">
            <div className="max-w-2xl mx-auto px-4 sm:px-6">
              <DarkScrollReveal>
                <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">
                  Send us a message
                </h2>

                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                      <Send className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Message sent!</h3>
                    <p className="text-white/50">
                      We&apos;ll get back to you within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-white/60 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                          placeholder="john@company.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-white/60 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                        placeholder="Your company"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-white/60 mb-2">
                        What can we help with?
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({ ...formData, type: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/20"
                      >
                        <option value="general">General inquiry</option>
                        <option value="sales">Sales</option>
                        <option value="support">Support</option>
                        <option value="partnership">Partnership</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-white/60 mb-2">
                        Message
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20 resize-none"
                        placeholder="Tell us about your needs..."
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-white text-black hover:bg-white/90 rounded-xl h-12"
                    >
                      {isSubmitting ? "Sending..." : "Send message"}
                    </Button>
                  </form>
                )}
              </DarkScrollReveal>
            </div>
          </section>
        </main>
      </div>

      <DarkFooter />
    </div>
  );
}
