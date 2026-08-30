import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Truck } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { vendorResource, type VendorRow } from '../../features/generic/resources'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { extractErrorMessage } from '../../api/client'

export function VendorsPage() {
  const dispatch = useAppDispatch()
  const { items, status } = useAppSelector((state) => state.vendors)

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [contact, setContact] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { dispatch(vendorResource.fetchAll()) }, [dispatch])

  const handleCreate = async () => {
    if (!name || !gstNumber || !contact) return
    setSubmitting(true)
    try {
      await dispatch(vendorResource.create({ name, gstNumber, contact, address: address || undefined }))
      toast.success('Vendor added.')
      setModalOpen(false); setName(''); setGstNumber(''); setContact(''); setAddress('')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<VendorRow>[] = [
    { key: 'name', header: 'Vendor', render: (v) => <span className="font-medium text-ink-900">{v.name}</span> },
    { key: 'gst', header: 'GST Number', render: (v) => v.gstNumber },
    { key: 'contact', header: 'Contact', render: (v) => v.contact },
    { key: 'address', header: 'Address', render: (v) => v.address ?? '—' },
    { key: 'status', header: 'Status', render: (v) => <Badge tone={v.isActive ? 'success' : 'neutral'}>{v.isActive ? 'Active' : 'Inactive'}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Manage suppliers for medicines, equipment, and consumables."
        actions={<Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Add Vendor</Button>}
      />
      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <Truck size={16} /> Vendor Directory
        </div>
        <div className="p-4">
          <Table columns={columns} rows={items} keyField={(v) => v.id} loading={status === 'loading'} />
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Vendor">
        <div className="space-y-4">
          <Input label="Vendor name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="GST number" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
          <Input label="Contact" value={contact} onChange={(e) => setContact(e.target.value)} />
          <Input label="Address" hint="Optional" value={address} onChange={(e) => setAddress(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={submitting} onClick={handleCreate}>Add Vendor</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
