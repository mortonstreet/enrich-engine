"use client";

import { useState } from "react";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { Button } from "@/components/ui/Button";
import { Mail, MessageSquare, Phone, MapPin, ArrowRight } from "lucide-react";

const contactMethods = [
  {
    icon: Mail,
    title: "Email us",
    description: "We'll respond within 24 hours",
    action: "hello@enrich.dev",
    href: "mailto:hello@enrich.dev",
  },
  {
    icon: MessageSquare,
    title: "Live chat",
    description: "Available M-F, 9am-6pm PT",
    action: "Start a conversation",
    href: "#",
  },
  {
    icon: Phone,
    title: "Call us",
    description: "For enterprise inquiries",
    action: "+1 (415) 555-0123",
    href: "tel:+14155550123",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
  };

  return (
    <div className="min-h-screen text-[#111827]">
      <AnimatedPixelBackground />
      <div className="relative z-10 bg-white">
        <Navigation />
        <main>
          {/* Hero */}
          <section className="py-20 md:py-28 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <ScrollReveal>
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-6"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Get in touch
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Have questions about our API? Want to discuss enterprise pricing?
                  We&apos;d love to hear from you.
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* Contact Methods */}
          <section className="py-12 bg-gray-50">
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid md:grid-cols-3 gap-6">
                {contactMethods.map((method, i) => (
                  <ScrollReveal key={i} delay={i * 80}>
                    <a
                      href={method.href}
                      className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-[#E63946]/30 hover:shadow-lg transition-all block group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#E63946]/10 flex items-center justify-center text-[#E63946] mb-4 group-hover:bg-[#E63946] group-hover:text-white transition-colors">
                        <method.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{method.title}</h3>
                      <p className="text-gray-500 text-sm mb-3">{method.description}</p>
                      <span className="text-[#E63946] font-medium text-sm">{method.action}</span>
                    </a>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Contact Form */}
          <section className="py-20 md:py-28 bg-white">
            <div className="max-w-3xl mx-auto px-6">
              <ScrollReveal>
                <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
                  <h2 className="text-2xl font-semibold mb-6">Send us a message</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                          Your name
                        </label>
                        <input
                          type="text"
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 focus:border-[#E63946]"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          Work email
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 focus:border-[#E63946]"
                          placeholder="john@company.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 focus:border-[#E63946]"
                        placeholder="Acme Inc"
                      />
                    </div>

                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                        How can we help?
                      </label>
                      <select
                        id="type"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 focus:border-[#E63946] bg-white"
                      >
                        <option value="general">General inquiry</option>
                        <option value="sales">Talk to sales</option>
                        <option value="support">Technical support</option>
                        <option value="partnership">Partnership</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                        Message
                      </label>
                      <textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={5}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 focus:border-[#E63946] resize-none"
                        placeholder="Tell us more about your needs..."
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#111827] text-white hover:bg-black h-12 text-base font-medium"
                    >
                      Send message
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Office Location */}
          <section className="py-16 bg-gray-50">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <ScrollReveal>
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">Headquarters</span>
                </div>
                <p className="text-lg text-gray-800">
                  131 Continental Dr Suite 305<br />
                  Newark, DE 19713
                </p>
              </ScrollReveal>
            </div>
          </section>
        </main>
      </div>
      <ExaFooter />
    </div>
  );
}
