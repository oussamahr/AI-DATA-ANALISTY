import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { datasetsApi } from '@/services/api'
import { toast } from 'sonner'

export default function UploadDatasetPage() {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const navigate = useNavigate()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      if (!name) setName(selected.name.replace(/\.[^/.]+$/, ""))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)
    formData.append('description', description)

    setIsUploading(true)
    try {
      await datasetsApi.upload(formData)
      toast.success('Dataset uploaded successfully')
      navigate('/datasets')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Upload Dataset</h1>
      <p className="text-[#6B7280] mb-8">Upload CSV, Excel or JSON files. Max size 50MB.</p>

      <div className="card p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">File</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#D9D9D9] rounded-2xl h-48 cursor-pointer hover:border-[#3A4B41]/40 transition-colors bg-white">
              <input type="file" className="hidden" onChange={handleFileChange} accept=".csv,.xlsx,.xls,.json" />
              {file ? (
                <div className="flex items-center gap-3 text-center">
                  <FileText className="w-8 h-8 text-[#3A4B41]" />
                  <div>
                    <div className="font-medium">{file.name}</div>
                    <div className="text-xs text-[#6B7280]">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-[#9CA3AF] mb-3" />
                  <div className="font-medium">Drop your file here or click to browse</div>
                  <div className="text-xs text-[#6B7280] mt-1">CSV, XLSX, JSON supported</div>
                </>
              )}
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Dataset name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Q4 Sales Data" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this dataset" />
          </div>

          <Button type="submit" disabled={!file || isUploading} className="w-full h-11">
            {isUploading ? 'Uploading...' : 'Upload Dataset'}
          </Button>
        </form>
      </div>
    </div>
  )
}
