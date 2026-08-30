import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Boxes, Plus } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { inventoryResource, type InventoryItemRow } from '../../features/generic/resources'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { extractErrorMessage } from '../../api/client'

const types = ['MedicalEquipment', 'SurgicalItem', 'Consumable']

export function InventoryPage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { items, status } = useAppSelector((state) => state.inventory)

  const [modalOpen, setModalOpen] = useState(false)
  const [itemName, setItemName] = useState('')
  const [type, setType] = useState(types[0])
  const [unit, setUnit] = useState('pcs')
  const [stock, setStock] = useState(0)
  const [reorderLevel, setReorderLevel] = useState(5)
  const [submitting, setSubmitting] = useState(false)

  const refresh = () => dispatch(inventoryResource.fetchAll())
  useEffect(() => { refresh() }, [dispatch])

  const handleCreate = async () => {
    if (!itemName) return
    setSubmitting(true)
    try {
      await dispatch(inventoryResource.create({ itemName, type, unit, stock, reorderLevel, branchId: user?.branchId ?? 1 }))
      toast.success('Inventory item added.')
      setModalOpen(false); setItemName(''); setStock(0)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<InventoryItemRow>[] = [
    { key: 'name', header: 'Item', render: (i) => <span className="font-medium text-ink-900">{i.itemName}</span> },
    { key: 'type', header: 'Type', render: (i) => <Badge tone="neutral">{i.type}</Badge> },
    { key: 'unit', header: 'Unit', render: (i) => i.unit },
    { key: 'stock', header: 'Stock', render: (i) => <Badge tone={i.stock <= i.reorderLevel ? 'danger' : 'success'}>{i.stock}</Badge> },
    { key: 'expiry', header: 'Expiry', render: (i) => i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : '—' },
  ]

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Track medical equipment, surgical items, and consumables."
        actions={<Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Add Item</Button>}
      />
      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <Boxes size={16} /> Stock
        </div>
        <div className="p-4">
          <Table columns={columns} rows={items} keyField={(i) => i.id} loading={status === 'loading'} />
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Inventory Item">
        <div className="space-y-4">
          <Input label="Item name" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
            <Input label="Stock" type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} />
            <Input label="Reorder level" type="number" value={reorderLevel} onChange={(e) => setReorderLevel(Number(e.target.value))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={submitting} onClick={handleCreate}>Add Item</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
