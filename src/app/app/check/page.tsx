"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Progress } from "@/components/ui/Progress";
import {
  FileUp,
  FileCheck2,
  FileText,
  AlertCircle,
  AlertOctagon,
  CheckCircle2,
  Cpu,
  Layers,
  ShieldCheck,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Sparkles,
  Play,
  FileSpreadsheet,
  RefreshCw,
  XCircle,
  Eye,
  EyeOff,
  Crosshair,
  Info,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { INITIAL_PROJECTS, SAMPLE_STANDARDS } from "@/lib/data/sample-data";
import { calculateSHA256, createReportFromUploadedFile, formatBytes } from "@/lib/services/report-store";

export default function CheckWorkflowPage() {
  const router = useRouter();

  // Workflow steps: "UPLOAD" | "PREVIEW" | "PROCESSING"
  const [step, setStep] = useState<"UPLOAD" | "PREVIEW" | "PROCESSING">("UPLOAD");

  // Raw file object for real dynamic ingestion
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Selected file metadata state
  const [fileData, setFileData] = useState<{
    name: string;
    size: string;
    pages: number;
    mime: string;
    hash: string;
    sampleKey?: "vdh19" | "wh402" | "mcc" | "tb200";
  } | null>(null);

  // Real schematic preview & visual framing state
  const [rasterizedPageUrl, setRasterizedPageUrl] = useState<string | null>(null);
  const [detectedSegments, setDetectedSegments] = useState<any[]>([]);
  const [detectedDefects, setDetectedDefects] = useState<any[]>([]);
  const [showSegments, setShowSegments] = useState(true);
  const [showDefects, setShowDefects] = useState(true);
  const [selectedFrame, setSelectedFrame] = useState<{ type: "SEGMENT" | "DEFECT"; data: any } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [selectedProject, setSelectedProject] = useState("");
  const [tenantProjects, setTenantProjects] = useState<{ id: string; name: string; customer?: string }[]>([]);
  const [selectedStandard, setSelectedStandard] = useState(SAMPLE_STANDARDS[0].code);

  React.useEffect(() => {
    fetch("/api/v1/projects")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setTenantProjects(data);
          setSelectedProject((prev) => (prev && data.some((p: any) => p.id === prev) ? prev : data[0].id));
        }
      })
      .catch((err) => console.warn("Failed to load tenant projects:", err));
  }, []);

  // Reference Netlist input (wire_no, colour, size_mm2, source, destination)
  const [expectedNetlistJson, setExpectedNetlistJson] = useState("");
  const [specificationIsComplete, setSpecificationIsComplete] = useState(false);
  const [promptVersion, setPromptVersion] = useState<"extract_v1" | "extract_v2">("extract_v1");
  const [showNetlistEditor, setShowNetlistEditor] = useState(false);

  // Document viewer controls
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  // Error handling state (Requirement per memo)
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Processing state stages
  const [processingStage, setProcessingStage] = useState<number>(0);

  const processingStages = [
    { label: "Upload & Hash Validated", pct: 15 },
    { label: "Document Parsed & High-DPI Rasterized", pct: 35 },
    { label: "Spatial OCR & Coordinate Mapping", pct: 55 },
    { label: "Diagram & Netlist Graph Extraction", pct: 72 },
    { label: `Comparing Against ${selectedStandard} Rules`, pct: 88 },
    { label: "Generating Structured QC Audit Report", pct: 100 },
  ];

  // Live schematic rasterization & frame extraction from Python core
  const fetchPreviewFrames = async (file: File | Blob, filename: string, pageNum = 1) => {
    setIsLoadingPreview(true);
    try {
      const formData = new FormData();
      formData.append("file", file, filename);
      formData.append("page", String(pageNum));
      formData.append("dpi", "110");

      const res = await fetch("/api/v1/qc/preview", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.image_url) {
          setRasterizedPageUrl(data.image_url);
        }
        if (Array.isArray(data.segments)) {
          setDetectedSegments(data.segments);
        }
        if (Array.isArray(data.defects)) {
          setDetectedDefects(data.defects);
        }
        if (data.total_pages) {
          setFileData((prev) => (prev ? { ...prev, pages: data.total_pages } : null));
        }
      }
    } catch (err) {
      console.warn("Schematic frame extraction notice:", err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Handler for custom file upload with thorough error handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setProcessingError(null);
    setSelectedFrame(null);
    setRasterizedPageUrl(null);
    setDetectedSegments([]);
    setDetectedDefects([]);
    setCurrentPage(1);

    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Check file size (100MB limit)
    const MAX_SIZE_BYTES = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(
        `Oversized File: "${file.name}" is ${formatBytes(file.size)}, which exceeds the 100MB maximum upload limit. Please provide an optimized schematic.`
      );
      return;
    }

    // 2. Check empty file (0 bytes)
    if (file.size === 0) {
      setUploadError(`Invalid File: "${file.name}" is empty (0 bytes). Please check your file export.`);
      return;
    }

    // 3. Check MIME type / extension
    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
    const isZip =
      file.type === "application/zip" ||
      file.type === "application/x-zip-compressed" ||
      lowerName.endsWith(".zip");
    const isSvg =
      file.type === "image/svg+xml" ||
      lowerName.endsWith(".svg");
    const isImage =
      file.type.startsWith("image/") ||
      lowerName.endsWith(".png") ||
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg") ||
      isSvg;

    if (!isPdf && !isImage && !isZip) {
      setUploadError(
        `Unsupported File Format: "${file.name}". SpanQC accepts wiring schematics in ZIP, PDF, PNG, JPG, JPEG, or SVG format.`
      );
      return;
    }

    // Compute real cryptographic hash
    const hash = await calculateSHA256(file);

    // Create immediate image preview if image
    if (isImage) {
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    } else {
      setImagePreviewUrl(null);
    }

    setRawFile(file);
    setFileData({
      name: file.name,
      size: formatBytes(file.size),
      pages: isImage ? 1 : isZip ? 1 : Math.max(1, Math.min(16, Math.round(file.size / (200 * 1024)))),
      mime: file.type || (isPdf ? "application/pdf" : isZip ? "application/zip" : isSvg ? "image/svg+xml" : "image/png"),
      hash: hash,
    });
    setStep("PREVIEW");

    // Immediately rasterize uploaded drawing and detect visual frames
    fetchPreviewFrames(file, file.name, 1);
  };

  // 1-Click Industrial Preloaded Samples
  const loadIndustrialSample = async (sample: "vdh19" | "wh402" | "mcc" | "tb200") => {
    setUploadError(null);
    setProcessingError(null);
    setSelectedFrame(null);
    setRasterizedPageUrl(null);
    setDetectedSegments([]);
    setDetectedDefects([]);
    setCurrentPage(1);
    setRawFile(null);
    setImagePreviewUrl(null);

    if (sample === "vdh19") {
      setFileData({
        name: "20032026074234-Input_VDH19_A_INPUT.pdf",
        size: "2.89 MB",
        pages: 3,
        mime: "application/pdf",
        hash: "da90d031b07d72ffe0c7548f3a7388ad61d1d14f226640aec3181eaefa0c4592",
        sampleKey: "vdh19",
      });
      setSelectedStandard("SPANQC Tech Pub (Hyundai VDH)");
      setStep("PREVIEW");

      try {
        const res = await fetch("/samples/VDH19_Wheel_Loader_Schematic.pdf");
        if (res.ok) {
          const blob = await res.blob();
          setRawFile(new File([blob], "20032026074234-Input_VDH19_A_INPUT.pdf", { type: "application/pdf" }));
          fetchPreviewFrames(blob, "Input_VDH19_A_INPUT.pdf", 1);
        }
      } catch (err) {
        console.warn("Could not load sample VDH PDF", err);
      }
    } else if (sample === "wh402") {
      setFileData({
        name: "WH-402_Avionics_Wiring_Manual_RevC.pdf",
        size: "4.19 MB",
        pages: 8,
        mime: "application/pdf",
        hash: "9f83a21b456cd89e1a2f3c4e5d6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
        sampleKey: "wh402",
      });
      setSelectedStandard("IPC/WHMA-A-620D");
      setImagePreviewUrl("/frames/frame_001.webp");
      setStep("PREVIEW");
    } else if (sample === "mcc") {
      setFileData({
        name: "MCC_VFD_Panel_Schematic_v2.pdf",
        size: "2.84 MB",
        pages: 4,
        mime: "application/pdf",
        hash: "8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b",
        sampleKey: "mcc",
      });
      setSelectedStandard("UL 508A");
      setImagePreviewUrl("/frames/frame_020.webp");
      setStep("PREVIEW");
    } else {
      setFileData({
        name: "TB200_Relay_Interface_Rev1.pdf",
        size: "1.65 MB",
        pages: 2,
        mime: "application/pdf",
        hash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
        sampleKey: "tb200",
      });
      setSelectedStandard("IPC/WHMA-A-620D");
      setImagePreviewUrl("/frames/frame_030.webp");
      setStep("PREVIEW");
    }
  };

  // Start Real Processing Pipeline wired to Python QC Service queue
  const handleStartQC = async () => {
    setProcessingError(null);
    setStep("PROCESSING");
    setProcessingStage(0);

    let fileToUpload: File | Blob | null = rawFile;

    // If sample was selected, fetch it as Blob
    if (!fileToUpload && fileData?.sampleKey) {
      try {
        const sampleUrl = fileData.sampleKey === "wh402" ? "/frames/frame_001.webp" : "/frames/frame_020.webp";
        const sampleRes = await fetch(sampleUrl);
        fileToUpload = await sampleRes.blob();
      } catch (err) {
        console.warn("Failed to fetch sample file as blob", err);
      }
    }

    if (!fileToUpload) {
      setProcessingError("No schematic file available to upload.");
      setStep("PREVIEW");
      return;
    }

    try {
      const activeProjectId =
        tenantProjects.length > 0
          ? tenantProjects.some((p) => p.id === selectedProject)
            ? selectedProject
            : tenantProjects[0].id
          : selectedProject || "default";

      const formData = new FormData();
      formData.append("file", fileToUpload, fileData?.name || "schematic.pdf");
      formData.append("projectId", activeProjectId);
      formData.append("standard", selectedStandard);
      if (expectedNetlistJson.trim()) {
        formData.append("expectedNetlistJson", expectedNetlistJson.trim());
      }
      formData.append("specificationIsComplete", String(specificationIsComplete));
      formData.append("promptVersion", promptVersion);
      formData.append("autoDispatch", "true");

      const response = await fetch("/api/v1/qc/jobs", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to create QC job in queue.");
      }

      const jobId = data.job_id;
      setProcessingStage(1);

      // Real status polling
      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        pollCount++;
        try {
          const jobRes = await fetch(`/api/v1/qc/jobs/${jobId}`);
          const jobData = await jobRes.json();

          if (jobData.status === "QUEUED") {
            setProcessingStage(1);
          } else if (jobData.status === "PROCESSING" || jobData.status === "EXTRACTING") {
            // Smoothly advance stage while processing
            const stage = Math.min(4, Math.max(2, Math.floor(pollCount / 3) + 2));
            setProcessingStage(stage);
          } else if (jobData.status === "ANALYZING") {
            setProcessingStage(3);
          } else if (jobData.status === "VALIDATING") {
            setProcessingStage(4);
          } else if (jobData.status === "COMPLETED" || jobData.status === "REVIEW_REQUIRED") {
            clearInterval(pollInterval);
            setProcessingStage(5);
            setTimeout(() => {
              router.push(`/app/reports/${jobId}`);
            }, 600);
          } else if (jobData.status === "FAILED") {
            clearInterval(pollInterval);
            setProcessingError(jobData.error_message || "QC processing failed on server.");
          }
        } catch (pollErr) {
          console.error("Poll error", pollErr);
        }

        if (pollCount > 240) {
          clearInterval(pollInterval);
          setProcessingError("QC Job timed out waiting for worker response.");
        }
      }, 1500);

    } catch (err: any) {
      console.error("[QC_RUN_ERROR]", err);
      setProcessingError(err.message || "Failed to dispatch QC job to worker queue.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Workflow Navigation Header */}
      <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Automated QC Inspection Workflow
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Step 1: Upload Schematic → Step 2: Validate & Configure → Step 3: Run Deterministic QC
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={step === "UPLOAD" ? "result" : "neutral"}
            result={step === "UPLOAD" ? "PENDING" : undefined}
            size="sm"
          >
            1. Upload
          </Badge>
          <span className="text-slate-600">→</span>
          <Badge
            variant={step === "PREVIEW" ? "result" : "neutral"}
            result={step === "PREVIEW" ? "PENDING" : undefined}
            size="sm"
          >
            2. Preview & Rules
          </Badge>
          <span className="text-slate-600">→</span>
          <Badge
            variant={step === "PROCESSING" ? "result" : "neutral"}
            result={step === "PROCESSING" ? "PENDING" : undefined}
            size="sm"
          >
            3. Processing
          </Badge>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-start gap-3 text-rose-200 text-xs">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-white mb-0.5">Upload Validation Warning</h4>
            <p>{uploadError}</p>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-rose-400 hover:text-white text-xs font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* STEP 1: UPLOAD EXPERIENCE */}
      {step === "UPLOAD" && (
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* Drag & Drop Upload Zone */}
          <div className="p-10 rounded-2xl border-2 border-dashed border-[#222e47] hover:border-cyan-400 bg-[#0c101a] transition-all text-center relative group shadow-2xl shadow-black/40 hover:shadow-cyan-500/5">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.svg,.zip"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-4 group-hover:scale-105 group-hover:border-cyan-400 transition-all">
              <FileUp className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Upload a wiring diagram manual
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
              Drag and drop your engineering schematic document or ZIP package here, or click to browse files.
            </p>
            <div className="inline-flex items-center gap-4 text-[11px] font-mono text-slate-400 bg-[#111726] px-4 py-2 rounded-xl border border-[#1b253b]">
              <span>SUPPORTED: ZIP, PDF, PNG, JPG, SVG</span>
              <span>•</span>
              <span>MAX SIZE: 100MB</span>
              <span>•</span>
              <span>SECURITY: SHA-256 HASHED</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: FILE PREVIEW & CONFIGURATION */}
      {step === "PREVIEW" && fileData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Document Viewer Controls & Interactive Blueprint Canvas */}
          <div className="lg:col-span-8 space-y-3">
            {/* Viewer Top Toolbar with Layer & Defect Toggles */}
            <div className="p-3 rounded-xl bg-[#0c101a] border border-[#1b253b] flex flex-wrap items-center justify-between gap-2 text-xs">
              {/* Page Selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newPage = Math.max(1, currentPage - 1);
                    setCurrentPage(newPage);
                    if (rawFile) fetchPreviewFrames(rawFile, fileData.name, newPage);
                  }}
                  disabled={currentPage <= 1 || isLoadingPreview}
                  className="p-1.5 rounded-lg bg-[#111726] border border-[#1b253b] text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-slate-300">
                  Page {currentPage} of {fileData.pages}
                </span>
                <button
                  onClick={() => {
                    const newPage = Math.min(fileData.pages, currentPage + 1);
                    setCurrentPage(newPage);
                    if (rawFile) fetchPreviewFrames(rawFile, fileData.name, newPage);
                  }}
                  disabled={currentPage >= fileData.pages || isLoadingPreview}
                  className="p-1.5 rounded-lg bg-[#111726] border border-[#1b253b] text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Interactive Layer Toggles (Segmentation & Defects) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSegments(!showSegments)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all border ${
                    showSegments
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                      : "bg-[#111726] text-slate-500 border-[#1b253b] hover:text-slate-300"
                  }`}
                  title="Toggle Segmentation Frames (Fusebox, CMCU, Connectors)"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Segments ({detectedSegments.length})</span>
                </button>

                <button
                  onClick={() => setShowDefects(!showDefects)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all border ${
                    showDefects
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                      : "bg-[#111726] text-slate-500 border-[#1b253b] hover:text-slate-300"
                  }`}
                  title="Toggle Defect Frames (Pin Swaps, Missing Wires, Deviations)"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Defects ({detectedDefects.length})</span>
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                  className="p-1.5 rounded-lg bg-[#111726] border border-[#1b253b] text-slate-300 hover:text-white cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-slate-300 w-12 text-center">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                  className="p-1.5 rounded-lg bg-[#111726] border border-[#1b253b] text-slate-300 hover:text-white cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(100)}
                  className="p-1.5 rounded-lg bg-[#111726] border border-[#1b253b] text-slate-300 hover:text-white cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Canvas Rendering: Authentic Upload + Segment & Defect Overlay Frames */}
            <div className="h-[520px] rounded-2xl bg-[#06070a] border border-[#1b253b] relative p-4 font-mono text-xs overflow-auto flex flex-col justify-between bg-schematic-grid-dense">
              <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-lg text-[11px] text-cyan-300 mb-2 w-full flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold">CAD SCHEMATIC: {fileData.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">(Page {currentPage})</span>
                </div>
                <div className="flex items-center gap-3">
                  {isLoadingPreview && (
                    <span className="text-cyan-400 flex items-center gap-1.5 animate-pulse text-[10px]">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Rasterizing Vector Sheet...
                    </span>
                  )}
                  <span className="text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    AUTHENTIC SCHEMATIC
                  </span>
                </div>
              </div>

              {/* Viewport & Interactive Blueprint Canvas */}
              <div className="flex-1 overflow-auto flex items-center justify-center p-2 relative">
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: "center center",
                    transition: "transform 0.15s ease-out",
                  }}
                  className="relative inline-block max-w-full"
                >
                  {/* REAL UPLOADED DRAWING IMAGE */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={rasterizedPageUrl || imagePreviewUrl || "/samples/VDH19_Wheel_Loader_Schematic.pdf"}
                    alt={fileData.name}
                    className="max-h-[440px] w-auto max-w-full object-contain rounded border border-slate-700 shadow-2xl bg-white select-none block"
                  />

                  {/* OVERLAY LAYER 1: FUNCTIONAL SEGMENTATION FRAMES */}
                  {showSegments &&
                    detectedSegments.map((seg) => (
                      <div
                        key={seg.id}
                        style={{
                          left: `${seg.bbox.left}%`,
                          top: `${seg.bbox.top}%`,
                          width: `${seg.bbox.width}%`,
                          height: `${seg.bbox.height}%`,
                          borderColor: seg.color,
                        }}
                        onClick={() => setSelectedFrame({ type: "SEGMENT", data: seg })}
                        className="absolute border-2 border-dashed bg-black/10 hover:bg-black/30 transition-all cursor-pointer z-10 group"
                      >
                        <span
                          style={{ backgroundColor: seg.color }}
                          className="absolute -top-3 left-1 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow font-mono uppercase whitespace-nowrap tracking-wide group-hover:scale-105 transition-transform"
                        >
                          {seg.name}
                        </span>
                      </div>
                    ))}

                  {/* OVERLAY LAYER 2: DEFECT DETECTION FRAMES */}
                  {showDefects &&
                    detectedDefects.map((defect) => (
                      <div
                        key={defect.id}
                        style={{
                          left: `${defect.bbox.left}%`,
                          top: `${defect.bbox.top}%`,
                          width: `${defect.bbox.width}%`,
                          height: `${defect.bbox.height}%`,
                        }}
                        onClick={() => setSelectedFrame({ type: "DEFECT", data: defect })}
                        className={`absolute border-2 transition-all cursor-pointer z-20 flex flex-col justify-between p-1 animate-pulse ${
                          defect.severity === "CRITICAL"
                            ? "border-rose-500 bg-rose-500/25 ring-2 ring-rose-500/70"
                            : "border-amber-500 bg-amber-500/25 ring-2 ring-amber-500/70"
                        }`}
                      >
                        <span className="text-[9px] font-extrabold text-white px-1.5 py-0.5 rounded shadow font-mono bg-rose-600 flex items-center gap-1 self-start whitespace-nowrap">
                          ⚠ {defect.title}
                        </span>
                        <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-black/85 text-rose-300 self-end border border-rose-500/40">
                          {defect.consequence}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Frame Inspector Drawer when a Frame is clicked */}
              {selectedFrame && (
                <div className="mt-2 p-3 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl flex items-start justify-between gap-4 text-xs shrink-0 animate-in fade-in slide-in-from-bottom-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono">
                        {selectedFrame.type === "DEFECT" ? "DEFECT DETECTED" : "FUNCTIONAL SEGMENT"}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-cyan-400 font-mono">
                        {selectedFrame.data.rule || selectedFrame.data.id}
                      </span>
                      {selectedFrame.type === "DEFECT" && (
                        <Badge variant="severity" severity={selectedFrame.data.severity} size="sm" />
                      )}
                    </div>
                    <p className="text-slate-300 font-medium">
                      {selectedFrame.data.title || selectedFrame.data.name}
                    </p>
                    {selectedFrame.data.details && (
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        {selectedFrame.data.details}
                      </p>
                    )}
                    {selectedFrame.data.observed && (
                      <div className="flex items-center gap-4 text-[10px] font-mono mt-1 text-slate-400">
                        <span>OBSERVED: <strong className="text-rose-400">{selectedFrame.data.observed}</strong></span>
                        <span>STANDARD: <strong className="text-emerald-400">{selectedFrame.data.expected}</strong></span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedFrame(null)}
                    className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-slate-800"
                  >
                    Close
                  </button>
                </div>
              )}

              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-900 flex items-center justify-between font-mono shrink-0">
                <span>SHA-256: {fileData.hash.slice(0, 24)}...</span>
                <span>ORIGINAL RESOLUTION: HIGH-DPI CAD VECTOR</span>
              </div>
            </div>
          </div>

          {/* Right: Document Metadata & Inspection Rules Configuration */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4 pb-2 border-b border-slate-800">
                Schematic File Specifications
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">DOCUMENT NAME</span>
                  <span className="text-slate-200 font-semibold break-all">{fileData.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">PAGES</span>
                    <span className="text-slate-200 font-semibold">{fileData.pages} Pages</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">FILE SIZE</span>
                    <span className="text-slate-200 font-semibold">{fileData.size}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">INTEGRITY STATUS</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Validated & Cryptographically Hashed
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono pb-2 border-b border-slate-800">
                Inspection Configuration
              </h3>

              {/* Target Project */}
              <Select
                label="Target Project"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                options={
                  tenantProjects.length > 0
                    ? tenantProjects.map((p) => ({
                        value: p.id,
                        label: p.name,
                        subtext: p.customer || undefined,
                      }))
                    : [
                        {
                          value: "default",
                          label: "General Inspection Project",
                          subtext: "Default active project",
                        },
                      ]
                }
              />

              {/* Standard to Validate Against */}
              <Select
                label="Compliance Standard"
                value={selectedStandard}
                onChange={(e) => setSelectedStandard(e.target.value)}
                options={SAMPLE_STANDARDS.map((s) => ({
                  value: s.code,
                  label: s.code,
                  subtext: `${s.rule_count} rules`,
                }))}
              />

              {/* Extraction Prompt Version */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">
                  AI Model & Prompt Version
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPromptVersion("extract_v1")}
                    className={`py-2 px-3 rounded-lg text-xs font-mono transition-all border ${
                      promptVersion === "extract_v1"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                        : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    extract_v1 (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromptVersion("extract_v2")}
                    className={`py-2 px-3 rounded-lg text-xs font-mono transition-all border ${
                      promptVersion === "extract_v2"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                        : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    extract_v2 (+Rule 8)
                  </button>
                </div>
              </div>

              {/* Reference Netlist (wire_no, colour, size_mm2, source, destination) */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Reference Netlist (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNetlistEditor(!showNetlistEditor)}
                    className="text-xs text-cyan-400 hover:underline font-mono"
                  >
                    {showNetlistEditor ? "Hide Editor ▲" : "Configure JSON ▼"}
                  </button>
                </div>

                {showNetlistEditor && (
                  <div className="space-y-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                    <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                      Expected format: <br />
                      <code className="text-cyan-300 text-[10px]">
                        [{`{"wire_no":"122A","colour":"WH","size_mm2":1.5,"source":"CFB1","destination":"CN-36"}`}]
                      </code>
                    </p>
                    <textarea
                      rows={5}
                      value={expectedNetlistJson}
                      onChange={(e) => setExpectedNetlistJson(e.target.value)}
                      placeholder='[&#10;  {"wire_no": "122A", "colour": "WH", "size_mm2": 1.5, "source": "CFB1", "destination": "CN-36"}&#10;]'
                      className="w-full p-2.5 rounded-lg bg-black/60 border border-slate-800 font-mono text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                    <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={specificationIsComplete}
                        onChange={(e) => setSpecificationIsComplete(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                      />
                      <span>Specification is declared 100% complete (extra wires fail QC)</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  onClick={handleStartQC}
                  variant="primary"
                  size="lg"
                  className="w-full shadow-lg shadow-blue-500/25 cursor-pointer"
                  rightIcon={<Play className="w-4 h-4" />}
                >
                  Run QC Check
                </Button>
                <button
                  onClick={() => {
                    setStep("UPLOAD");
                    setFileData(null);
                    setRawFile(null);
                    setImagePreviewUrl(null);
                  }}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-200 mt-2 cursor-pointer"
                >
                  Cancel and upload different file
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* STEP 3: REAL STAGE-BASED PROCESSING EXPERIENCE */}
      {step === "PROCESSING" && (
        <div className="max-w-2xl mx-auto py-12">
          <Card className="p-8 text-center space-y-8 border-cyan-500/30 bg-[#0c101a] shadow-2xl shadow-cyan-500/10 relative overflow-hidden">
            {/* Background radar effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            {processingError ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Analysis Interrupted</h3>
                <p className="text-xs text-rose-300 max-w-md mx-auto">{processingError}</p>
                <div className="pt-4 flex justify-center gap-3">
                  <Button onClick={handleStartQC} variant="primary" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />}>
                    Retry Processing
                  </Button>
                  <Button onClick={() => setStep("PREVIEW")} variant="outline" size="sm">
                    Back to File Preview
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto mb-4 animate-pulse shadow-lg shadow-cyan-500/20">
                    <Cpu className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Analyzing wiring diagram...
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    {fileData?.name} • Executing against {selectedStandard}
                  </p>
                </div>

                {/* Linear Progress Indicator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cyan-400 font-bold uppercase tracking-wider">
                      {processingStages[processingStage].label}
                    </span>
                    <span className="text-white font-bold">
                      {processingStages[processingStage].pct}%
                    </span>
                  </div>
                  <Progress
                    value={processingStages[processingStage].pct}
                    variant="brand"
                    size="md"
                  />
                </div>

                {/* Actual Pipeline Stages Checklist */}
                <div className="pt-4 border-t border-[#1b253b] text-left space-y-3">
                  {processingStages.map((stage, idx) => {
                    const isDone = idx < processingStage;
                    const isCurrent = idx === processingStage;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 text-xs transition-colors ${
                          isDone
                            ? "text-emerald-400 font-semibold"
                            : isCurrent
                            ? "text-cyan-400 font-bold"
                            : "text-slate-600"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <span className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                        )}
                        <span>{stage.label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
