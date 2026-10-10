"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/ui/Table";
import { Users, UserPlus, ShieldCheck, Mail, CheckCircle2, Trash2 } from "lucide-react";
import { OrgMember, UserRole } from "@/types";

export default function TeamPage() {
  const [members, setMembers] = useState<OrgMember[]>([
    {
      id: "bc4a8b56-47da-4de2-b4ab-da448f4163dc",
      email: "pravin@spandsons.com",
      full_name: "Pravin Sundaram",
      role: "ADMIN",
      is_active: true,
      joined_at: "2026-09-25",
      last_active: "Active now",
    },
    {
      id: "b82954d0-7a22-4af1-a030-74ad5c0a6f00",
      email: "gogulnath@spandsons.com",
      full_name: "Gogulnath",
      role: "ENGINEER",
      is_active: true,
      joined_at: "2026-09-25",
      last_active: "2 hours ago",
    },
    {
      id: "f33cd61a-e604-41a2-8756-241777740b9d",
      email: "inspector@spandsons.com",
      full_name: "Lead QC Inspector",
      role: "REVIEWER",
      is_active: true,
      joined_at: "2026-09-26",
      last_active: "Yesterday",
    },
  ]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("REVIEWER");

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const newMember: OrgMember = {
      id: `usr-${Date.now()}`,
      email: inviteEmail,
      full_name: inviteName || inviteEmail.split("@")[0],
      role: inviteRole,
      is_active: true,
      joined_at: new Date().toISOString().split("T")[0],
      last_active: "Invited",
    };

    setMembers([...members, newMember]);
    setIsInviteModalOpen(false);
    setInviteEmail("");
    setInviteName("");
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b253b] pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Team & Organization Members
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Role-based access control (RBAC) governing drawing upload, discrepancy arbitration, and report export permissions.
          </p>
        </div>

        <Button
          onClick={() => setIsInviteModalOpen(true)}
          variant="primary"
          size="sm"
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Invite Team Member
        </Button>
      </div>

      {/* Role Definitions Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#0c101a] border border-[#1b253b] shadow-xl">
          <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">ADMIN ROLE</span>
          <p className="text-xs font-semibold text-white mt-1">Full Organization Authority</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Manages team invites, subscription upgrades, custom rule sets, and project permissions.
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-[#0c101a] border border-[#1b253b] shadow-xl">
          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider">ENGINEER ROLE</span>
          <p className="text-xs font-semibold text-white mt-1">Upload & Drawing Processing</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Uploads wiring schematics, configures rule packs, and inspects automated discrepancy overlays.
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-[#0c101a] border border-[#1b253b] shadow-xl">
          <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider">REVIEWER ROLE</span>
          <p className="text-xs font-semibold text-white mt-1">Quality Arbitration & Sign-Off</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Arbitrates findings (Accept/Reject), records review comments, and signs off on formal QC certificates.
          </p>
        </div>
      </div>

      {/* Members Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <tr>
              <TableHeader>Member Name & Email</TableHeader>
              <TableHeader>Role</TableHeader>
              <TableHeader>Joined Date</TableHeader>
              <TableHeader>Activity</TableHeader>
              <TableHeader>Actions</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs shrink-0">
                      {member.full_name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-white tracking-tight">{member.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{member.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#111726] border border-[#1b253b] text-cyan-300">
                    {member.role}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-slate-400 text-xs">{member.joined_at}</TableCell>
                <TableCell>
                  <span className="text-xs text-slate-300 font-mono">{member.last_active}</span>
                </TableCell>
                <TableCell>
                  {member.role !== "ADMIN" && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Organization Member"
        description="Grant workspace access and assign role-based permissions."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Full Name"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="e.g. Ananya Sharma"
          />

          <Input
            label="Work Email"
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="ananya@spandsons.com"
          />

          <Select
            label="Workspace Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
            options={[
              { value: "REVIEWER", label: "REVIEWER", subtext: "Quality sign-off and arbitration" },
              { value: "ENGINEER", label: "ENGINEER", subtext: "Schematic upload and check execution" },
              { value: "ADMIN", label: "ADMIN", subtext: "Full organization authority" },
            ]}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b253b]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
