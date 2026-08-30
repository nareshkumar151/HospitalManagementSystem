import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CreditCard, Download, IndianRupee, Plus, Receipt } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { collectPayment, createBill, createRazorpayOrder, fetchPendingBills, verifyRazorpayPayment } from '../../features/billing/billingSlice'
import { fetchPatients } from '../../features/patients/patientsSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { downloadFile, extractErrorMessage } from '../../api/client'
import { openRazorpayCheckout } from '../../utils/razorpay'
import type { BillDto } from '../../types'

interface LineItem { description: string; quantity: number; unitPrice: number }

export function BillingPage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { pending, status } = useAppSelector((state) => state.billing)
  const { list: patients } = useAppSelector((state) => state.patients)

  const [createOpen, setCreateOpen] = useState(false)
  const [payTarget, setPayTarget] = useState<BillDto | null>(null)
  const [patientId, setPatientId] = useState<number | ''>('')
  const [billType, setBillType] = useState('Consultation')
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0 }])
  const [discount, setDiscount] = useState(0)
  const [gst, setGst] = useState(5)
  const [payAmount, setPayAmount] = useState(0)
  const [payMode, setPayMode] = useState('Cash')
  const [submitting, setSubmitting] = useState(false)
  const [payingOnline, setPayingOnline] = useState(false)

  useEffect(() => { dispatch(fetchPendingBills()) }, [dispatch])
  useEffect(() => { dispatch(fetchPatients({ pageSize: 100 })) }, [dispatch])

  const addItem = () => setItems((i) => [...i, { description: '', quantity: 1, unitPrice: 0 }])
  const updateItem = (index: number, patch: Partial<LineItem>) => setItems((i) => i.map((line, idx) => (idx === index ? { ...line, ...patch } : line)))
  const removeItem = (index: number) => setItems((i) => i.filter((_, idx) => idx !== index))
  const subTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)

  const handleCreateBill = async () => {
    if (!patientId || items.every((i) => !i.description)) return
    setSubmitting(true)
    try {
      const bill = await dispatch(createBill({
        patientId, type: billType, items: items.filter((i) => i.description), discountAmount: discount, gstPercent: gst, branchId: user?.branchId ?? 1,
      }))
      toast.success(`Bill ${bill.billNumber} created for ₹${bill.totalAmount}`)
      setCreateOpen(false)
      setItems([{ description: '', quantity: 1, unitPrice: 0 }]); setPatientId(''); setDiscount(0)
      dispatch(fetchPendingBills())
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCollectPayment = async () => {
    if (!payTarget || payAmount <= 0) return
    setSubmitting(true)
    try {
      await dispatch(collectPayment({ billId: payTarget.id, amount: payAmount, mode: payMode }))
      toast.success('Payment collected.')
      setPayTarget(null); setPayAmount(0)
      dispatch(fetchPendingBills())
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayOnline = async () => {
    if (!payTarget) return
    setPayingOnline(true)
    try {
      const order = await dispatch(createRazorpayOrder(payTarget.id))
      const result = await openRazorpayCheckout({
        keyId: order.razorpayKeyId,
        amountInPaise: order.amountInPaise,
        currency: order.currency,
        orderId: order.razorpayOrderId,
        patientName: payTarget.patientName,
      })
      await dispatch(verifyRazorpayPayment({
        billId: payTarget.id,
        razorpayOrderId: result.razorpay_order_id,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpaySignature: result.razorpay_signature,
      }))
      toast.success('Payment received via Razorpay.')
      setPayTarget(null)
      dispatch(fetchPendingBills())
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Online payment could not be completed.'))
    } finally {
      setPayingOnline(false)
    }
  }

  const handleDownloadReceipt = async (bill: BillDto) => {
    try {
      await downloadFile(`/billing/${bill.id}/pdf`, `Receipt-${bill.billNumber}.pdf`)
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not download the receipt.'))
    }
  }

  const columns: Column<BillDto>[] = [
    { key: 'number', header: 'Bill #', render: (b) => <span className="font-mono text-xs">{b.billNumber}</span> },
    { key: 'patient', header: 'Patient', render: (b) => b.patientName },
    { key: 'type', header: 'Type', render: (b) => <Badge tone="neutral">{b.type}</Badge> },
    { key: 'total', header: 'Total', render: (b) => `₹${b.totalAmount.toLocaleString('en-IN')}` },
    { key: 'paid', header: 'Paid', render: (b) => `₹${b.paidAmount.toLocaleString('en-IN')}` },
    { key: 'status', header: 'Status', render: (b) => <Badge>{b.status}</Badge> },
    {
      key: 'actions', header: '', render: (b) => (
        <div className="flex gap-3">
          <button onClick={() => { setPayTarget(b); setPayAmount(b.totalAmount - b.paidAmount) }} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
            <CreditCard size={13} /> Collect
          </button>
          <button onClick={() => handleDownloadReceipt(b)} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:underline">
            <Download size={13} /> Receipt
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Generate bills and collect payments for consultations, admissions, labs, and pharmacy."
        actions={<Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>Create Bill</Button>}
      />

      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
          <Receipt size={16} /> Pending &amp; Partially Paid Bills
        </div>
        <div className="p-4">
          <Table columns={columns} rows={pending} keyField={(b) => b.id} loading={status === 'loading'} emptyMessage="No pending bills." />
        </div>
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Bill" widthClassName="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Patient" value={patientId} onChange={(e) => setPatientId(Number(e.target.value) || '')}>
              <option value="">Select patient</option>
              {patients?.items.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
            </Select>
            <Select label="Bill type" value={billType} onChange={(e) => setBillType(e.target.value)}>
              {['Consultation', 'Admission', 'Lab', 'Pharmacy', 'Operation', 'Room', 'Nursing'].map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-ink-700">Line items</span>
              <Button size="sm" variant="secondary" onClick={addItem}>+ Add line</Button>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2">
                  <input className="col-span-6 rounded-md border border-ink-100 px-2 py-1.5 text-sm" placeholder="Description" value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} />
                  <input type="number" min={1} className="col-span-2 rounded-md border border-ink-100 px-2 py-1.5 text-sm" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} />
                  <input type="number" min={0} className="col-span-3 rounded-md border border-ink-100 px-2 py-1.5 text-sm" placeholder="Unit price" value={item.unitPrice} onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })} />
                  <button onClick={() => removeItem(index)} className="col-span-1 text-danger-500">✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Discount (₹)" type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            <Input label="GST (%)" type="number" value={gst} onChange={(e) => setGst(Number(e.target.value))} />
          </div>

          <div className="rounded-lg bg-surface-muted p-3 text-sm text-ink-700">
            Subtotal ₹{subTotal.toFixed(2)} + GST {gst}% − Discount ₹{discount} ={' '}
            <span className="font-semibold text-ink-900">₹{(subTotal + subTotal * gst / 100 - discount).toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={submitting} disabled={!patientId} onClick={handleCreateBill}>Create Bill</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title="Collect Payment">
        {payTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface-muted p-3 text-sm">
              <p className="font-medium text-ink-900">{payTarget.billNumber} · {payTarget.patientName}</p>
              <p className="text-ink-500">Total ₹{payTarget.totalAmount} · Paid ₹{payTarget.paidAmount} · Balance ₹{(payTarget.totalAmount - payTarget.paidAmount).toFixed(2)}</p>
            </div>
            <Button className="w-full" variant="secondary" icon={<IndianRupee size={16} />} loading={payingOnline} onClick={handlePayOnline}>
              Pay Online via Razorpay (Card / UPI / NetBanking)
            </Button>

            <div className="flex items-center gap-2 text-xs text-ink-500">
              <span className="h-px flex-1 bg-ink-100" /> or record a manual payment <span className="h-px flex-1 bg-ink-100" />
            </div>

            <Input label="Amount" type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
            <Select label="Payment mode" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
              {['Cash', 'Card', 'UPI', 'Insurance'].map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setPayTarget(null)}>Cancel</Button>
              <Button variant="success" loading={submitting} onClick={handleCollectPayment}>Collect Payment</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
