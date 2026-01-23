"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { CheckCircle, AlertCircle, Clock, Activity, ArrowUpRight } from "lucide-react";

const services = [
  { name: "API", status: "operational", uptime: 99.99 },
  { name: "Email Enrichment", status: "operational", uptime: 99.98 },
  { name: "Phone Enrichment", status: "operational", uptime: 99.95 },
  { name: "Bulk Processing", status: "operational", uptime: 99.97 },
  { name: "Webhooks", status: "operational", uptime: 99.99 },
  { name: "Dashboard", status: "operational", uptime: 99.99 },
];

const incidents = [
  {
    date: "Jan 15, 2025",
    title: "Increased latency on Email Enrichment",
    status: "resolved",
    duration: "32 minutes",
    description: "We experienced increased latency on our email enrichment service due to a database query optimization issue. The issue has been resolved.",
  },
  {
    date: "Jan 8, 2025",
    title: "Scheduled maintenance",
    status: "completed",
    duration: "15 minutes",
    description: "Scheduled maintenance to upgrade our infrastructure. All services remained available during the maintenance window.",
  },
  {
    date: "Dec 28, 2024",
    title: "Webhook delivery delays",
    status: "resolved",
    duration: "45 minutes",
    description: "Some webhook deliveries were delayed due to high traffic. We've increased capacity to prevent future occurrences.",
  },
];

const uptimeHistory = [
  { day: "Mon", uptime: 100 },
  { day: "Tue", uptime: 100 },
  { day: "Wed", uptime: 99.9 },
  { day: "Thu", uptime: 100 },
  { day: "Fri", uptime: 100 },
  { day: "Sat", uptime: 100 },
  { day: "Sun", uptime: 100 },
];

export default function StatusPage() {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const allOperational = services.every((s) => s.status === "operational");

  return (
    <div className="min-h-screen text-[#111827]">
      <AnimatedPixelBackground />
      <div className="relative z-10 bg-white">
        <Navigation />
        <main>
          {/* Hero */}
          <section className="py-16 md:py-20 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <ScrollReveal>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${
                  allOperational ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {allOperational ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {allOperational ? "All Systems Operational" : "Partial Outage"}
                </div>
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-4"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  System Status
                </h1>
                <p className="text-gray-600 flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  Last updated: {currentTime} PT
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* Services */}
          <section className="py-12 bg-gray-50">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <h2 className="text-xl font-semibold mb-6">Services</h2>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {services.map((service, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-5 ${
                        i !== services.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          service.status === "operational" ? "bg-emerald-500" : "bg-amber-500"
                        }`} />
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{service.uptime}% uptime</span>
                        <span className={`text-sm font-medium ${
                          service.status === "operational" ? "text-emerald-600" : "text-amber-600"
                        }`}>
                          {service.status === "operational" ? "Operational" : "Degraded"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Uptime Graph */}
          <section className="py-12 bg-white">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">90-Day Uptime</h2>
                  <div className="flex items-center gap-2 text-2xl font-bold text-emerald-600">
                    <Activity className="w-5 h-5" />
                    99.98%
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="flex items-end justify-between gap-1 h-32">
                    {Array.from({ length: 90 }).map((_, i) => {
                      const uptime = 99 + Math.random();
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-t ${
                            uptime >= 99.9 ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                          style={{ height: `${(uptime - 99) * 100}%` }}
                          title={`Day ${90 - i}: ${uptime.toFixed(2)}%`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-4 text-xs text-gray-500">
                    <span>90 days ago</span>
                    <span>Today</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Recent Incidents */}
          <section className="py-12 bg-gray-50">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <h2 className="text-xl font-semibold mb-6">Recent Incidents</h2>
                <div className="space-y-4">
                  {incidents.map((incident, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="font-semibold mb-1">{incident.title}</h3>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{incident.date}</span>
                            <span>•</span>
                            <span>{incident.duration}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          incident.status === "resolved" || incident.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {incident.status}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm">{incident.description}</p>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Subscribe */}
          <section className="py-16 bg-white">
            <div className="max-w-xl mx-auto px-6 text-center">
              <ScrollReveal>
                <h2 className="text-2xl font-semibold mb-4">Stay informed</h2>
                <p className="text-gray-600 mb-6">
                  Subscribe to receive status updates via email or SMS.
                </p>
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder="you@company.com"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 focus:border-[#E63946]"
                  />
                  <button className="px-6 py-3 bg-[#111827] text-white rounded-xl hover:bg-black font-medium transition-colors">
                    Subscribe
                  </button>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* External Links */}
          <section className="py-12 bg-gray-50">
            <div className="max-w-4xl mx-auto px-6">
              <div className="flex flex-wrap justify-center gap-6">
                <a
                  href="#"
                  className="flex items-center gap-2 text-gray-600 hover:text-[#E63946] transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  API Health Check
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 text-gray-600 hover:text-[#E63946] transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Historical Uptime
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 text-gray-600 hover:text-[#E63946] transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Report an Issue
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
      <ExaFooter />
    </div>
  );
}
