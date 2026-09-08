import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Building2, Hospital as HospitalIcon, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { createBranch, createHospital, deleteBranch, deleteHospital, fetchBranches, fetchHospitals, updateHospital } from '../../features/organization/organizationSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { CreateHospitalUserModal } from '../../components/admin/CreateHospitalUserModal'
import { extractErrorMessage } from '../../api/client'
import type { BranchDto, HospitalDto } from '../../types'

const DEFAULT_THEME_COLOR = '#16a08a' // the app's own default brand-500, used as the color picker's starting point

interface HospitalFormState {
  name: string; registrationNumber: string; address: string; contactNumber: string; email: string; themeColor: string
}
const emptyHospitalForm: HospitalFormState = { name: '', registrationNumber: '', address: '', contactNumber: '', email: '', themeColor: DEFAULT_THEME_COLOR }

/** Native color input + hex readout, styled to match the rest of this page's fields. */
function ColorField({ label, value, onChange, hint }: { label: string; value: string; onChange: (hex: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-ink-100 bg-white p-1"
        />
        <input
          type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-shadow focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40"
        />
      </div>
      {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </label>
  )
}

/** SuperAdmin-only: platform-level management of Hospitals and their Branches. Administrator manages
 * everything within a branch (Departments, Doctors, Employees, ...) but cannot create/delete either. */
export function HospitalsManagePage() {
  const dispatch = useAppDispatch()
  const { hospitals, branches, status } = useAppSelector((state) => state.organization)

  const [hospitalModalOpen, setHospitalModalOpen] = useState(false)
  const [editingHospital, setEditingHospital] = useState<HospitalDto | null>(null)
  const [branchModalOpen, setBranchModalOpen] = useState(false)
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loginTargetBranch, setLoginTargetBranch] = useState<BranchDto | null>(null)

  const [hospitalForm, setHospitalForm] = useState<HospitalFormState>(emptyHospitalForm)
  const [branchForm, setBranchForm] = useState({ name: '', address: '', city: '', contactNumber: '' })

  useEffect(() => { dispatch(fetchHospitals()); dispatch(fetchBranches()) }, [dispatch])

  const handleCreateHospital = async () => {
    if (!hospitalForm.name || !hospitalForm.registrationNumber || !hospitalForm.address || !hospitalForm.contactNumber) return
    setSubmitting(true)
    try {
      await dispatch(createHospital({ ...hospitalForm, email: hospitalForm.email || undefined }))
      toast.success('Hospital added.')
      setHospitalModalOpen(false)
      setHospitalForm(emptyHospitalForm)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const openEditHospital = (hospital: HospitalDto) => {
    setEditingHospital(hospital)
    setHospitalForm({
      name: hospital.name, registrationNumber: hospital.registrationNumber, address: hospital.address,
      contactNumber: hospital.contactNumber, email: hospital.email ?? '', themeColor: hospital.themeColor ?? DEFAULT_THEME_COLOR,
    })
  }

  const handleUpdateHospital = async () => {
    if (!editingHospital || !hospitalForm.name || !hospitalForm.registrationNumber || !hospitalForm.address || !hospitalForm.contactNumber) return
    setSubmitting(true)
    try {
      await dispatch(updateHospital(editingHospital.id, { ...hospitalForm, email: hospitalForm.email || undefined }))
      toast.success('Hospital updated.')
      setEditingHospital(null)
      setHospitalForm(emptyHospitalForm)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteHospital = async (hospital: HospitalDto) => {
    if (!window.confirm(`Delete "${hospital.name}"? This only succeeds if it has no active branches.`)) return
    try {
      await dispatch(deleteHospital(hospital.id))
      toast.success('Hospital deleted.')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const openBranchModal = (hospitalId: number) => {
    setSelectedHospitalId(hospitalId)
    setBranchModalOpen(true)
  }

  const handleCreateBranch = async () => {
    if (!selectedHospitalId || !branchForm.name || !branchForm.address || !branchForm.city || !branchForm.contactNumber) return
    setSubmitting(true)
    try {
      await dispatch(createBranch({ hospitalId: selectedHospitalId, ...branchForm }))
      toast.success('Branch added.')
      setBranchModalOpen(false)
      setBranchForm({ name: '', address: '', city: '', contactNumber: '' })
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBranch = async (branch: BranchDto) => {
    if (!window.confirm(`Delete "${branch.name}"? This only succeeds if it has no active departments, doctors, employees, or patients.`)) return
    try {
      await dispatch(deleteBranch(branch.id, branch.hospitalId))
      toast.success('Branch deleted.')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const hospitalColumns: Column<HospitalDto>[] = [
    {
      key: 'name', header: 'Hospital', render: (h) => (
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full border border-ink-100" style={{ background: h.themeColor ?? DEFAULT_THEME_COLOR }} title="Theme color" />
          <span className="font-medium text-ink-900">{h.name}</span>
        </div>
      ),
    },
    { key: 'reg', header: 'Registration #', render: (h) => h.registrationNumber },
    { key: 'address', header: 'Address', render: (h) => h.address },
    { key: 'contact', header: 'Contact', render: (h) => h.contactNumber },
    {
      key: 'actions', header: '', render: (h) => (
        <div className="flex gap-3">
          <button onClick={() => openEditHospital(h)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
            <Pencil size={12} /> Edit
          </button>
          <button onClick={() => openBranchModal(h.id)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
            <Plus size={12} /> Add Branch
          </button>
          <button onClick={() => handleDeleteHospital(h)} className="flex items-center gap-1 text-xs font-medium text-danger-500 hover:underline">
            <Trash2 size={12} /> Delete
          </button>
        </div>
      ),
    },
  ]

  const branchColumns: Column<BranchDto>[] = [
    { key: 'name', header: 'Branch', render: (b) => <span className="font-medium text-ink-900">{b.name}</span> },
    { key: 'hospital', header: 'Hospital', render: (b) => hospitals.find((h) => h.id === b.hospitalId)?.name ?? `#${b.hospitalId}` },
    { key: 'city', header: 'City', render: (b) => b.city },
    { key: 'contact', header: 'Contact', render: (b) => b.contactNumber },
    {
      key: 'actions', header: '', render: (b) => (
        <div className="flex gap-3">
          <button onClick={() => setLoginTargetBranch(b)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
            <KeyRound size={12} /> Create Login
          </button>
          <button onClick={() => handleDeleteBranch(b)} className="flex items-center gap-1 text-xs font-medium text-danger-500 hover:underline">
            <Trash2 size={12} /> Delete
          </button>
        </div>
      ),
    },
  ]

  const closeHospitalModals = () => {
    setHospitalModalOpen(false)
    setEditingHospital(null)
    setHospitalForm(emptyHospitalForm)
  }

  return (
    <div>
      <PageHeader
        title="Hospitals"
        subtitle="Platform-level: add or remove Hospitals and their Branches across the whole system."
        actions={<Button icon={<Plus size={16} />} onClick={() => setHospitalModalOpen(true)}>Add Hospital</Button>}
      />

      <Card padded={false} className="mb-4">
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <HospitalIcon size={16} /> Hospitals
        </div>
        <div className="p-4"><Table columns={hospitalColumns} rows={hospitals} keyField={(h) => h.id} loading={status === 'loading'} /></div>
      </Card>

      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <Building2 size={16} /> Branches
        </div>
        <div className="p-4"><Table columns={branchColumns} rows={branches} keyField={(b) => b.id} emptyMessage="No branches yet." /></div>
      </Card>

      <Modal open={hospitalModalOpen || !!editingHospital} onClose={closeHospitalModals} title={editingHospital ? `Edit ${editingHospital.name}` : 'Add Hospital'}>
        <div className="space-y-4">
          <Input label="Hospital name" value={hospitalForm.name} onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })} />
          <Input label="Registration number" value={hospitalForm.registrationNumber} onChange={(e) => setHospitalForm({ ...hospitalForm, registrationNumber: e.target.value })} />
          <Input label="Address" value={hospitalForm.address} onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })} />
          <Input label="Contact number" value={hospitalForm.contactNumber} onChange={(e) => setHospitalForm({ ...hospitalForm, contactNumber: e.target.value })} />
          <Input label="Email" hint="Optional" type="email" value={hospitalForm.email} onChange={(e) => setHospitalForm({ ...hospitalForm, email: e.target.value })} />
          <ColorField
            label="Theme color" value={hospitalForm.themeColor} onChange={(themeColor) => setHospitalForm({ ...hospitalForm, themeColor })}
            hint="Repaints the app for every login at this hospital."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeHospitalModals}>Cancel</Button>
            <Button loading={submitting} onClick={editingHospital ? handleUpdateHospital : handleCreateHospital}>
              {editingHospital ? 'Save Changes' : 'Add Hospital'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={branchModalOpen} onClose={() => setBranchModalOpen(false)} title="Add Branch">
        <div className="space-y-4">
          <Input label="Branch name" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
          <Input label="Address" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
          <Input label="City" value={branchForm.city} onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })} />
          <Input label="Contact number" value={branchForm.contactNumber} onChange={(e) => setBranchForm({ ...branchForm, contactNumber: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setBranchModalOpen(false)}>Cancel</Button>
            <Button loading={submitting} onClick={handleCreateBranch}>Add Branch</Button>
          </div>
        </div>
      </Modal>

      {loginTargetBranch && (
        <CreateHospitalUserModal
          open={!!loginTargetBranch}
          onClose={() => setLoginTargetBranch(null)}
          branch={loginTargetBranch}
          hospitalName={hospitals.find((h) => h.id === loginTargetBranch.hospitalId)?.name ?? `Hospital #${loginTargetBranch.hospitalId}`}
        />
      )}
    </div>
  )
}
