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
      const res = await api.get(`/file-list?page=${page}&limit=2`);
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

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Title</TableHead>
                <TableHead>File</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell
                    className="text-blue-600 cursor-pointer hover:underline"
                    onClick={() => handleTitleClick(file.taskId, file.title)}
                    title="Click to open chat"
                  >
                    {file.title}
                  </TableCell>

                  <TableCell>
                    {file.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <a href={file.fileUrl} download={file.fileName}>
                        <img
                          src={file.fileUrl}
                          alt={file.fileName}
                          className="h-16 w-16 object-cover rounded-md border hover:opacity-80"
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

          {/* ✅ Pagination Controls */}
          {pagination && (
            <div className="flex justify-center mt-4 gap-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </Button>

              {[...Array(pagination.totalPages)].map((_, i) => (
                <Button
                  key={i + 1}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}

              <Button
                variant="outline"
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
