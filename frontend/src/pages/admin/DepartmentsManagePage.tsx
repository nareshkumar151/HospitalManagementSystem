import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Building2, Plus } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { fetchDepartments } from '../../features/doctors/doctorsSlice'
import { apiClient, extractErrorMessage } from '../../api/client'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import type { DepartmentDto } from '../../types'

export function DepartmentsManagePage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { departments, status } = useAppSelector((state) => state.doctors)

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { dispatch(fetchDepartments()) }, [dispatch])

  const handleCreate = async () => {
    if (!name) return
    setSubmitting(true)
    try {
      await apiClient.post('/departments', { branchId: user?.branchId ?? 1, name, description: description || undefined })
      toast.success('Department added.')
      setModalOpen(false); setName(''); setDescription('')
      dispatch(fetchDepartments())
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<DepartmentDto>[] = [
    { key: 'name', header: 'Name', render: (d) => <span className="font-medium text-ink-900">{d.name}</span> },
    { key: 'description', header: 'Description', render: (d) => d.description ?? '—' },
    { key: 'status', header: 'Status', render: (d) => <Badge tone={d.isActive ? 'success' : 'neutral'}>{d.isActive ? 'Active' : 'Inactive'}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Manage clinical departments across the hospital."
        actions={<Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Add Department</Button>}
      />
      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <Building2 size={16} /> Departments
        </div>
        <div className="p-4">
          <Table columns={columns} rows={departments} keyField={(d) => d.id} loading={status === 'loading'} />
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Department">
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Description" hint="Optional" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={submitting} onClick={handleCreate}>Add Department</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
