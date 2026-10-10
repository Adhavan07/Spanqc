"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/ui/Table";
import {
  History as HistoryIcon,
  Eye,
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  AlertOctagon,
} from "lucide-react";
import { getAllReportsList, triggerExcelExport, triggerPdfExport } from "@/lib/services/report-store";
import { QCRun } from "@/types";

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [reports, setReports] = useState<QCRun[]>([]);

  useEffect(() => {
    setReports(getAllReportsList());
  }, []);

  const filtered = reports.filter((item) => {
    const docName = item.document?.filename || "";
    const projName = item.project?.name || "";
    const std = item.standard || "";

    const matchesSearch =
      docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      projName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      std.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesResult = resultFilter === "ALL" || item.overall_result === resultFilter;
    return matchesSearch && matchesResult;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b253b] pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Inspection History & Audit Trail
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of all automated schematic QC checks, human engineering reviews, and export records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/app/check">
            <Button variant="primary" size="sm">
              Run New QC Check
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Search history by document, project, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="bg-[#0c101a] border border-[#1b253b] rounded-xl text-xs px-3.5 py-2 text-slate-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="ALL">All Outcomes</option>
            <option value="PASS">Pass Only</option>
            <option value="FAIL">Fail (Discrepancies Found)</option>
          </select>
        </div>
      </div>

      {/* Reports History Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <tr>
              <TableHeader>Report / Document</TableHeader>
              <TableHeader>Project & Standard</TableHeader>
              <TableHeader>Audit Timestamp</TableHeader>
              <TableHeader>Outcome</TableHeader>
              <TableHeader>Discrepancies</TableHeader>
              <TableHeader>Actions</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {filtered.map((item) => {
              const findingsCount = item.findings?.length || 0;
              const criticalCount = item.findings?.filter((f) => f.severity === "CRITICAL").length || 0;

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-white tracking-tight">
                        {item.document?.filename || "Schematic Document"}
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono mt-0.5">
                        {item.id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-slate-300">{item.project?.name || "General Program"}</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">{item.standard}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{item.started_at ? new Date(item.started_at).toLocaleDateString() : "Recent"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="result" result={item.overall_result} size="xs" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-mono">
                      <span className={criticalCount > 0 ? "text-rose-400 font-bold" : "text-slate-400"}>
                        {findingsCount} issues
                      </span>
                      {criticalCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                          {criticalCount} Crit
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/app/reports/${item.id}`}>
                        <Button variant="ghost" size="xs" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                          View
                        </Button>
                      </Link>
                      <button
                        onClick={() => triggerExcelExport(item)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Download XLSX Report"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => triggerPdfExport(item)}
                        className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Download PDF Certificate"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
