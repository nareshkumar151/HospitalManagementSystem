import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { BedDouble, FlaskConical, Pencil, Plus, Receipt, Trash2 } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { fetchRooms, updateRoomDailyCharge } from '../../features/beds/bedsSlice'
import { addLabCatalogItem, deleteLabCatalogItem, fetchLabCatalog, updateLabCatalogItem } from '../../features/laboratory/laboratorySlice'
import { addChargeCatalogItem, deleteChargeCatalogItem, fetchChargeCatalog, updateChargeCatalogItem } from '../../features/chargeCatalog/chargeCatalogSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { extractErrorMessage } from '../../api/client'
import type { ChargeCatalogCategory, ChargeCatalogItemDto, RoomDto } from '../../types'

type Tab = 'RoomTariff' | 'Investigation' | 'NurseCharges' | 'GeneralService' | 'Others'

const TABS: { key: Tab; label: string }[] = [
  { key: 'RoomTariff', label: 'Room Tariff' },
  { key: 'Investigation', label: 'Investigation (Lab Tests)' },
  { key: 'NurseCharges', label: 'Nurse Charges' },
  { key: 'GeneralService', label: 'General Service' },
  { key: 'Others', label: 'Others' },
]

// Rate master for every charge category the provisional bill prints. Consultation fee is deliberately not
// here - it's already set per-doctor on the Doctors page.
export function RateMasterPage() {
  const dispatch = useAppDispatch()
  const { rooms } = useAppSelector((state) => state.beds)
  const { catalog: labCatalog } = useAppSelector((state) => state.laboratory)
  const { items: chargeCatalog } = useAppSelector((state) => state.chargeCatalog)

  const [tab, setTab] = useState<Tab>('RoomTariff')

  useEffect(() => {
    dispatch(fetchRooms())
    dispatch(fetchLabCatalog())
    dispatch(fetchChargeCatalog(true))
  }, [dispatch])

  return (
    <div>
      <PageHeader
        title="Rate Master"
        subtitle="Set the rates Generate Bill uses for room tariff, investigations, nurse charges, and general services."
      />

      <div className="mb-4 flex flex-wrap gap-1 border-b border-ink-100 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === t.key ? 'bg-brand-500 text-white' : 'text-ink-700 hover:bg-surface-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'RoomTariff' && <RoomTariffTab rooms={rooms} />}
      {tab === 'Investigation' && <InvestigationTab catalog={labCatalog} />}
      {(tab === 'NurseCharges' || tab === 'GeneralService' || tab === 'Others') && (
        <ChargeCatalogTab category={tab} items={chargeCatalog.filter((c) => c.category === tab)} />
      )}
    </div>
  )
}

function RoomTariffTab({ rooms }: { rooms: RoomDto[] }) {
  const dispatch = useAppDispatch()
  const [editTarget, setEditTarget] = useState<RoomDto | null>(null)
  const [rate, setRate] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const openEdit = (r: RoomDto) => { setEditTarget(r); setRate(r.dailyCharge) }

  const save = async () => {
    if (!editTarget) return
    setSubmitting(true)
    try {
      await dispatch(updateRoomDailyCharge(editTarget.id, rate))
      toast.success('Room tariff updated.')
      setEditTarget(null)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<RoomDto>[] = [
    { key: 'room', header: 'Room', render: (r) => r.roomNumber },
    { key: 'type', header: 'Type', render: (r) => <Badge tone="neutral">{r.type}</Badge> },
    { key: 'charge', header: 'Daily Charge', render: (r) => `₹${r.dailyCharge.toLocaleString('en-IN')}` },
    {
      key: 'actions', header: '', render: (r) => (
        <button onClick={() => openEdit(r)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
          <Pencil size={13} /> Edit Rate
        </button>
      ),
    },
  ]

  return (
    <>
      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <BedDouble size={16} /> Rooms
        </div>
        <div className="p-4">
          <Table columns={columns} rows={rooms} keyField={(r) => r.id} emptyMessage="No rooms on file." />
        </div>
      </Card>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Room Tariff">
        {editTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">Room {editTarget.roomNumber} · {editTarget.type}</p>
            <Input label="Daily Charge (₹)" type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button loading={submitting} onClick={save}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

function InvestigationTab({ catalog }: { catalog: { id: number; testName: string; category: string; price: number; normalRange: string | null }[] }) {
  const dispatch = useAppDispatch()
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [testName, setTestName] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState(0)
  const [normalRange, setNormalRange] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const openAdd = () => { setEditId(null); setTestName(''); setCategory(''); setPrice(0); setNormalRange(''); setModalOpen(true) }
  const openEdit = (item: typeof catalog[number]) => {
    setEditId(item.id); setTestName(item.testName); setCategory(item.category); setPrice(item.price); setNormalRange(item.normalRange ?? ''); setModalOpen(true)
  }

  const save = async () => {
    if (!testName || !category) return
    setSubmitting(true)
    try {
      const payload = { testName, category, price, normalRange: normalRange || undefined }
      if (editId) await dispatch(updateLabCatalogItem(editId, payload))
      else await dispatch(addLabCatalogItem(payload))
      toast.success(editId ? 'Test rate updated.' : 'Test added.')
      setModalOpen(false)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id: number) => {
    if (!window.confirm('Remove this test from the catalog?')) return
    try {
      await dispatch(deleteLabCatalogItem(id))
      toast.success('Test removed.')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const columns: Column<typeof catalog[number]>[] = [
    { key: 'name', header: 'Test Name', render: (t) => t.testName },
    { key: 'category', header: 'Category', render: (t) => <Badge tone="neutral">{t.category}</Badge> },
    { key: 'price', header: 'Rate', render: (t) => `₹${t.price.toLocaleString('en-IN')}` },
    { key: 'range', header: 'Normal Range', render: (t) => t.normalRange ?? <span className="text-ink-400">—</span> },
    {
      key: 'actions', header: '', render: (t) => (
        <div className="flex gap-3">
          <button onClick={() => openEdit(t)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"><Pencil size={13} /> Edit</button>
          <button onClick={() => remove(t.id)} className="flex items-center gap-1 text-xs font-medium text-danger-500 hover:underline"><Trash2 size={13} /> Remove</button>
        </div>
      ),
    },
  ]

  return (
    <>
      <Card padded={false}>
        <div className="flex items-center justify-between gap-2 border-b border-ink-100 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-700"><FlaskConical size={16} /> Lab Test Catalog</div>
          <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Test</Button>
        </div>
        <div className="p-4">
          <Table columns={columns} rows={catalog} keyField={(t) => t.id} emptyMessage="No tests in the catalog yet." />
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Test Rate' : 'Add Test'}>
        <div className="space-y-4">
          <Input label="Test name" value={testName} onChange={(e) => setTestName(e.target.value)} />
          <Input label="Category" hint="e.g. Hematology, Biochemistry" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input label="Rate (₹)" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          <Input label="Normal range" hint="Optional" value={normalRange} onChange={(e) => setNormalRange(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={submitting} disabled={!testName || !category} onClick={save}>{editId ? 'Save' : 'Add'}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function ChargeCatalogTab({ category, items }: { category: ChargeCatalogCategory; items: ChargeCatalogItemDto[] }) {
  const dispatch = useAppDispatch()
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [itemName, setItemName] = useState('')
  const [rate, setRate] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const openAdd = () => { setEditId(null); setItemName(''); setRate(0); setIsActive(true); setModalOpen(true) }
  const openEdit = (item: ChargeCatalogItemDto) => { setEditId(item.id); setItemName(item.itemName); setRate(item.rate); setIsActive(item.isActive); setModalOpen(true) }

  const save = async () => {
    if (!itemName) return
    setSubmitting(true)
    try {
      const payload = { category, itemName, rate, isActive }
      if (editId) await dispatch(updateChargeCatalogItem(editId, payload))
      else await dispatch(addChargeCatalogItem(payload))
      toast.success(editId ? 'Rate updated.' : 'Charge added.')
      setModalOpen(false)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id: number) => {
    if (!window.confirm('Remove this charge from the rate list?')) return
    try {
      await dispatch(deleteChargeCatalogItem(id))
      toast.success('Charge removed.')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const columns: Column<ChargeCatalogItemDto>[] = [
    { key: 'name', header: 'Item', render: (c) => c.itemName },
    { key: 'rate', header: 'Rate', render: (c) => `₹${c.rate.toLocaleString('en-IN')}` },
    { key: 'status', header: 'Status', render: (c) => <Badge tone={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'actions', header: '', render: (c) => (
        <div className="flex gap-3">
          <button onClick={() => openEdit(c)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"><Pencil size={13} /> Edit</button>
          <button onClick={() => remove(c.id)} className="flex items-center gap-1 text-xs font-medium text-danger-500 hover:underline"><Trash2 size={13} /> Remove</button>
        </div>
      ),
    },
  ]

  return (
    <>
      <Card padded={false}>
        <div className="flex items-center justify-between gap-2 border-b border-ink-100 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-700"><Receipt size={16} /> {TABS.find((t) => t.key === category)?.label}</div>
          <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Charge</Button>
        </div>
        <div className="p-4">
          <Table columns={columns} rows={items} keyField={(c) => c.id} emptyMessage="No charges set up yet." />
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Rate' : 'Add Charge'}>
        <div className="space-y-4">
          <Input label="Item name" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          <Input label="Rate (₹)" type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          <Select label="Status" value={isActive ? '1' : '0'} onChange={(e) => setIsActive(e.target.value === '1')}>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={submitting} disabled={!itemName} onClick={save}>{editId ? 'Save' : 'Add'}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
