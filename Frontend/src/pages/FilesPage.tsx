import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface FileItem {
  id: number;
  taskId?: number;
  title: string;
  fileUrl: string;
  fileName: string;
  uploadDate: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFiles(currentPage);
  }, [currentPage]);

  const fetchFiles = async (page: number) => {
    try {
      const res = await api.get(`/file-list?page=${page}&limit=20`);
      setFiles(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error("Failed to load files:", error);
    }
  };

  const handleTitleClick = (taskId?: number, title?: string) => {
    if (!taskId || !title) return;
    const safeTitle = encodeURIComponent(title);
    navigate(`/tasks/${taskId}/${safeTitle}/chat`);
  };

 const handleDownload = (url: string, fileName: string) => {
  // Create an invisible <a> tag
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  link.style.display = "none";
  
  // Append to DOM
  document.body.appendChild(link);

  // Trigger download
  link.click();

  // Clean up 
  document.body.removeChild(link);
};

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Uploaded Files</h1>

    <Card className="relative">
  {/* ✅ Scrollable table area */}
  <CardContent className="p-0 max-h-[520px] overflow-y-auto">
    <Table>
      <TableHeader className="sticky top-0 bg-gray-50 z-10">
        <TableRow>
          <TableHead className="py-2 px-4 text-sm font-medium">Task Title</TableHead>
          <TableHead className="py-2 px-4 text-sm font-medium">Files</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {files.map((file) => (
          <TableRow key={file.id} className="hover:bg-gray-50">
            <TableCell
              className="py-2 px-4 text-blue-600 cursor-pointer hover:underline text-sm"
              onClick={() => handleTitleClick(file.taskId, file.title)}
              title="Click to open chat"
            >
              {file.title}
            </TableCell>

            <TableCell className="py-2 px-4 text-sm">
              {file.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <a href={file.fileUrl} download={file.fileName}>
                  <img
                    src={file.fileUrl}
                    alt={file.fileName}
                    className="h-14 w-14 object-cover rounded-md border hover:opacity-80"
                    title="Click to download"
                  />
                </a>
              ) : (
                <span
                  onClick={() => handleDownload(file.fileUrl, file.fileName)}
                  className="text-blue-600 underline cursor-pointer"
                >
                  {file.fileName}
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>

  {/* ✅ Fixed Pagination Bar */}
  {pagination && (
    <div className="sticky bottom-0 left-0 w-full bg-white border-t py-3 flex justify-center gap-2 z-20">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === 1}
        onClick={() => setCurrentPage((p) => p - 1)}
      >
        Previous
      </Button>

      {[...Array(pagination.totalPages)].map((_, i) => (
        <Button
          key={i + 1}
          size="sm"
          variant={currentPage === i + 1 ? "default" : "outline"}
          onClick={() => setCurrentPage(i + 1)}
        >
          {i + 1}
        </Button>
      ))}

      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === pagination.totalPages}
        onClick={() => setCurrentPage((p) => p + 1)}
      >
        Next
      </Button>
    </div>
  )}
</Card>


    </div>
  );
}
