import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Pill, ShoppingCart, Plus, Pencil, PackagePlus } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { createMedicine, dispenseSale, fetchMedicines, purchaseMedicine, updateMedicine } from '../../features/pharmacy/pharmacySlice'
import { fetchPatients } from '../../features/patients/patientsSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { extractErrorMessage } from '../../api/client'
import type { MedicineDto } from '../../types'

interface CartLine { medicineId: number; quantity: number }

const emptyMedicineForm = {
  medicineName: '', genericName: '', batchNumber: '', expiryDate: '', manufacturer: '',
  purchasePrice: 0, sellingPrice: 0, stock: 0, reorderLevel: 10,
}

export function PharmacyPage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { medicines, status } = useAppSelector((state) => state.pharmacy)
  const { list: patients } = useAppSelector((state) => state.patients)

  const [search, setSearch] = useState('')
  const [dispenseOpen, setDispenseOpen] = useState(false)
  const [patientId, setPatientId] = useState<number | ''>('')
  const [cart, setCart] = useState<CartLine[]>([{ medicineId: 0, quantity: 1 }])
  const [submitting, setSubmitting] = useState(false)

  const [medicineModalOpen, setMedicineModalOpen] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState<MedicineDto | null>(null)
  const [medicineForm, setMedicineForm] = useState(emptyMedicineForm)

  const [purchaseTarget, setPurchaseTarget] = useState<MedicineDto | null>(null)
  const [purchaseQty, setPurchaseQty] = useState(0)
  const [purchaseCost, setPurchaseCost] = useState(0)

  useEffect(() => {
    dispatch(fetchMedicines({ search: search || undefined, pageSize: 50 }))
  }, [dispatch, search])

  useEffect(() => { dispatch(fetchPatients({ pageSize: 100 })) }, [dispatch])

  const addCartLine = () => setCart((c) => [...c, { medicineId: 0, quantity: 1 }])
  const updateCartLine = (index: number, patch: Partial<CartLine>) =>
    setCart((c) => c.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  const removeCartLine = (index: number) => setCart((c) => c.filter((_, i) => i !== index))

  const handleDispense = async () => {
    if (!patientId) return
    const items = cart.filter((line) => line.medicineId && line.quantity > 0)
    if (items.length === 0) return
    setSubmitting(true)
    try {
      const sale = await dispatch(dispenseSale({ patientId, items }))
      toast.success(`Dispensed - Invoice ${sale.invoiceNumber} · ₹${sale.totalAmount}`)
      setDispenseOpen(false)
      setCart([{ medicineId: 0, quantity: 1 }])
      setPatientId('')
      dispatch(fetchMedicines({ pageSize: 50 }))
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const openAddMedicine = () => {
    setEditingMedicine(null)
    setMedicineForm(emptyMedicineForm)
    setMedicineModalOpen(true)
  }

  const openEditMedicine = (medicine: MedicineDto) => {
    setEditingMedicine(medicine)
    setMedicineForm({
      medicineName: medicine.medicineName, genericName: medicine.genericName, batchNumber: medicine.batchNumber,
      expiryDate: medicine.expiryDate.slice(0, 10), manufacturer: medicine.manufacturer,
      purchasePrice: medicine.purchasePrice, sellingPrice: medicine.sellingPrice, stock: medicine.stock, reorderLevel: medicine.reorderLevel,
    })
    setMedicineModalOpen(true)
  }

  const handleSaveMedicine = async () => {
    if (!medicineForm.medicineName || !medicineForm.genericName || !medicineForm.batchNumber || !medicineForm.expiryDate) return
    setSubmitting(true)
    try {
      if (editingMedicine) {
        // Stock is intentionally not editable here - it only changes through Purchase/Dispense so every
        // unit movement stays in the MedicineStockTransactions audit trail.
        const { stock: _stock, ...editableFields } = medicineForm
        await dispatch(updateMedicine(editingMedicine.id, editableFields))
        toast.success('Medicine updated.')
      } else {
        await dispatch(createMedicine({ ...medicineForm, branchId: user?.branchId ?? 1 }))
        toast.success('Medicine added.')
      }
      setMedicineModalOpen(false)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePurchase = async () => {
    if (!purchaseTarget || purchaseQty <= 0 || purchaseCost <= 0) return
    setSubmitting(true)
    try {
      await dispatch(purchaseMedicine({ medicineId: purchaseTarget.id, quantity: purchaseQty, unitCost: purchaseCost }))
      toast.success(`Added ${purchaseQty} units to ${purchaseTarget.medicineName}.`)
      setPurchaseTarget(null)
      setPurchaseQty(0)
      setPurchaseCost(0)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<MedicineDto>[] = [
    { key: 'name', header: 'Medicine', render: (m) => <span className="font-medium text-ink-900">{m.medicineName}</span> },
    { key: 'generic', header: 'Generic', render: (m) => m.genericName },
    { key: 'batch', header: 'Batch', render: (m) => <span className="font-mono text-xs">{m.batchNumber}</span> },
    { key: 'expiry', header: 'Expiry', render: (m) => new Date(m.expiryDate).toLocaleDateString() },
    { key: 'price', header: 'Price', render: (m) => `₹${m.sellingPrice}` },
    {
      key: 'stock', header: 'Stock', render: (m) => (
        <Badge tone={m.stock <= m.reorderLevel ? 'danger' : 'success'}>{m.stock} units</Badge>
      ),
    },
    {
      key: 'actions', header: '', render: (m) => (
        <div className="flex gap-3">
          <button onClick={() => openEditMedicine(m)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
            <Pencil size={12} /> Edit
          </button>
          <button onClick={() => setPurchaseTarget(m)} className="flex items-center gap-1 text-xs font-medium text-success-500 hover:underline">
            <PackagePlus size={12} /> Purchase Stock
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Pharmacy"
        subtitle="Manage medicine stock and dispense prescriptions to patients."
        actions={
          <>
            <Button variant="secondary" icon={<Plus size={16} />} onClick={openAddMedicine}>Add Medicine</Button>
            <Button icon={<ShoppingCart size={16} />} onClick={() => setDispenseOpen(true)}>Dispense Sale</Button>
          </>
        }
      />

      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ink-100 p-4">
          <Pill size={16} className="text-ink-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicines…"
            className="w-full max-w-sm rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
          />
        </div>
        <div className="p-4">
          <Table columns={columns} rows={medicines?.items ?? []} keyField={(m) => m.id} loading={status === 'loading'} />
        </div>
      </Card>

      <Modal open={dispenseOpen} onClose={() => setDispenseOpen(false)} title="Dispense Sale" widthClassName="max-w-2xl">
        <div className="space-y-4">
          <Select label="Patient" value={patientId} onChange={(e) => setPatientId(Number(e.target.value) || '')}>
            <option value="">Select patient</option>
            {patients?.items.map((p) => <option key={p.id} value={p.id}>{p.fullName} · {p.mobile}</option>)}
          </Select>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-ink-700">Items</span>
              <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={addCartLine}>Add line</Button>
            </div>
            <div className="space-y-2">
              {cart.map((line, index) => {
                const medicine = medicines?.items.find((m) => m.id === line.medicineId)
                return (
                  <div key={index} className="grid grid-cols-12 items-center gap-2 rounded-lg bg-surface-muted p-2">
                    <select className="col-span-6 rounded-md border border-ink-100 px-2 py-1.5 text-sm" value={line.medicineId} onChange={(e) => updateCartLine(index, { medicineId: Number(e.target.value) })}>
                      <option value={0} disabled>Select medicine</option>
                      {medicines?.items.map((m) => <option key={m.id} value={m.id}>{m.medicineName} (stock: {m.stock})</option>)}
                    </select>
                    <input type="number" min={1} className="col-span-2 rounded-md border border-ink-100 px-2 py-1.5 text-sm" value={line.quantity} onChange={(e) => updateCartLine(index, { quantity: Number(e.target.value) })} />
                    <span className="col-span-3 text-sm text-ink-500">
                      {medicine ? `₹${(medicine.sellingPrice * line.quantity).toFixed(2)}` : '—'}
                    </span>
                    <button onClick={() => removeCartLine(index)} className="col-span-1 text-danger-500">✕</button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDispenseOpen(false)}>Cancel</Button>
            <Button loading={submitting} disabled={!patientId} onClick={handleDispense}>Confirm Dispense</Button>
          </div>
        </div>
      </Modal>

      <Modal open={medicineModalOpen} onClose={() => setMedicineModalOpen(false)} title={editingMedicine ? 'Edit Medicine' : 'Add Medicine'} widthClassName="max-w-2xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Medicine name" value={medicineForm.medicineName} onChange={(e) => setMedicineForm({ ...medicineForm, medicineName: e.target.value })} />
          <Input label="Generic name" value={medicineForm.genericName} onChange={(e) => setMedicineForm({ ...medicineForm, genericName: e.target.value })} />
          <Input label="Batch number" value={medicineForm.batchNumber} onChange={(e) => setMedicineForm({ ...medicineForm, batchNumber: e.target.value })} />
          <Input label="Expiry date" type="date" value={medicineForm.expiryDate} onChange={(e) => setMedicineForm({ ...medicineForm, expiryDate: e.target.value })} />
          <Input label="Manufacturer" value={medicineForm.manufacturer} onChange={(e) => setMedicineForm({ ...medicineForm, manufacturer: e.target.value })} />
          <Input label="Reorder level" type="number" value={medicineForm.reorderLevel} onChange={(e) => setMedicineForm({ ...medicineForm, reorderLevel: Number(e.target.value) })} />
          <Input label="Purchase price" type="number" value={medicineForm.purchasePrice} onChange={(e) => setMedicineForm({ ...medicineForm, purchasePrice: Number(e.target.value) })} />
          <Input label="Selling price" type="number" value={medicineForm.sellingPrice} onChange={(e) => setMedicineForm({ ...medicineForm, sellingPrice: Number(e.target.value) })} />
          {!editingMedicine && (
            <Input label="Initial stock" type="number" value={medicineForm.stock} onChange={(e) => setMedicineForm({ ...medicineForm, stock: Number(e.target.value) })} />
          )}
          {editingMedicine && (
            <p className="sm:col-span-2 text-xs text-ink-500">
              Stock isn't edited here - use "Purchase Stock" to add units, so every change stays in the audit trail.
            </p>
          )}
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setMedicineModalOpen(false)}>Cancel</Button>
            <Button loading={submitting} onClick={handleSaveMedicine}>{editingMedicine ? 'Save Changes' : 'Add Medicine'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!purchaseTarget} onClose={() => setPurchaseTarget(null)} title="Purchase Stock">
        {purchaseTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-700">
              Adding stock for <span className="font-medium">{purchaseTarget.medicineName}</span> (current: {purchaseTarget.stock} units)
            </p>
            <Input label="Quantity to add" type="number" min={1} value={purchaseQty} onChange={(e) => setPurchaseQty(Number(e.target.value))} />
            <Input label="Unit cost (₹)" type="number" min={0} value={purchaseCost} onChange={(e) => setPurchaseCost(Number(e.target.value))} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setPurchaseTarget(null)}>Cancel</Button>
              <Button variant="success" loading={submitting} disabled={purchaseQty <= 0 || purchaseCost <= 0} onClick={handlePurchase}>Add Stock</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
