"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  FolderKanban,
  Plus,
  FileText,
  FileCheck2,
  Calendar,
  Building2,
  ArrowRight,
  Search,
} from "lucide-react";
import { INITIAL_PROJECTS, SAMPLE_STANDARDS } from "@/lib/data/sample-data";
import { Project } from "@/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New project form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCustomer, setNewCustomer] = useState("");
  const [newStandard, setNewStandard] = useState("IPC/WHMA-A-620D");

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const created: Project = {
      id: `proj-${Date.now()}`,
      organization_id: "org-spandsons",
      name: newName,
      description: newDesc,
      customer: newCustomer || "Internal R&D",
      standard: newStandard,
      created_at: new Date().toISOString(),
      document_count: 0,
      report_count: 0,
      status: "ACTIVE",
    };

    setProjects([created, ...projects]);
    setIsModalOpen(false);
    setNewName("");
    setNewDesc("");
    setNewCustomer("");
  };

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.customer && p.customer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b253b] pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Organization Projects
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage engineering programs, customer deliverables, and drawing repositories.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Project
        </Button>
      </div>

      {/* Search */}
      <div className="w-full sm:w-72">
        <SearchInput
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")}
        />
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map((proj) => (
          <div
            key={proj.id}
            className="p-6 rounded-2xl border border-[#1b253b] bg-[#0c101a] hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  {proj.standard}
                </span>
                <Badge variant="neutral" size="xs">
                  {proj.status || "ACTIVE"}
                </Badge>
              </div>

              <h3 className="text-base font-bold text-white tracking-tight">{proj.name}</h3>
              <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                {proj.description || "No project description provided."}
              </p>

              <div className="mt-4 pt-4 border-t border-[#1b253b] space-y-2 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Customer:</span>
                  <span className="text-slate-200 font-medium">{proj.customer || "Internal"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Documents:</span>
                  <span className="text-slate-200 font-mono">{proj.document_count || 0} Schematics</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Reports Generated:</span>
                  <span className="text-slate-200 font-mono">{proj.report_count || 0} Reports</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1b253b] flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                Created: {proj.created_at.split("T")[0]}
              </span>
              <Link href="/app/check">
                <Button variant="ghost" size="xs" rightIcon={<ArrowRight className="w-3 h-3" />}>
                  Inspect
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* New Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Project"
        description="Initialize an organization project scoped with specific wiring standards."
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input
            label="Project Name"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Commercial Avionics Harness WD-777"
          />

          <Input
            label="Customer / Client Organization"
            value={newCustomer}
            onChange={(e) => setNewCustomer(e.target.value)}
            placeholder="e.g. Aerospace Systems Corp"
          />

          <Select
            label="Default Compliance Standard"
            value={newStandard}
            onChange={(e) => setNewStandard(e.target.value)}
            options={SAMPLE_STANDARDS.map((s) => ({
              value: s.code,
              label: s.code,
              subtext: s.name,
            }))}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
              Project Description
            </label>
            <textarea
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Scope of schematics, harness routing requirements, engineering notes..."
              className="w-full bg-[#070b14] text-slate-100 placeholder:text-slate-500 border border-[#1b253b] rounded-xl text-sm p-3 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b253b]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
