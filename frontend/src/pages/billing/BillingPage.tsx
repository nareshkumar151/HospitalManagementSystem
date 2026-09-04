import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CreditCard, Download, IndianRupee, Plus, Receipt } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { collectPayment, createBill, createRazorpayOrder, fetchPendingBills, verifyRazorpayPayment } from '../../features/billing/billingSlice'
import { fetchPatients } from '../../features/patients/patientsSlice'
import { fetchActiveAdmissions } from '../../features/ipd/ipdSlice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { downloadFile, extractErrorMessage } from '../../api/client'
import { openRazorpayCheckout } from '../../utils/razorpay'
import { admissionTypeLabel } from '../../utils/admissionTypes'
import type { BillCategory, BillDto } from '../../types'

interface LineItem { description: string; quantity: number; unitPrice: number }

export function BillingPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const guidedState = location.state as { guidedPatientId?: number; guidedIpdAdmissionId?: number } | null
  const guidedPatientId = guidedState?.guidedPatientId
  // Set when arriving here right after IPD/Admissions -> Admit Patient, so Create Bill opens pre-filled
  // for "Bill for: IPD" against the admission that was just created, instead of the receptionist having
  // to switch it over and find the admission themselves.
  const guidedIpdAdmissionId = guidedState?.guidedIpdAdmissionId
  const user = useAppSelector((state) => state.auth.user)
  const { pending, status } = useAppSelector((state) => state.billing)
  const { list: patients } = useAppSelector((state) => state.patients)
  const { active: activeAdmissions } = useAppSelector((state) => state.ipd)

  const [createOpen, setCreateOpen] = useState(!!guidedPatientId)
  const [payTarget, setPayTarget] = useState<BillDto | null>(null)
  const [patientId, setPatientId] = useState<number | ''>(guidedPatientId ?? '')
  const [billType, setBillType] = useState(guidedIpdAdmissionId ? 'Admission' : 'Consultation')
  const [billCategory, setBillCategory] = useState<BillCategory>(guidedIpdAdmissionId ? 'IPD' : 'OPD')
  const [ipdAdmissionId, setIpdAdmissionId] = useState<number | ''>(guidedIpdAdmissionId ?? '')
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0 }])
  const [discount, setDiscount] = useState(0)
  const [gst, setGst] = useState(5)
  const [payAmount, setPayAmount] = useState(0)
  const [payMode, setPayMode] = useState('Cash')
  const [submitting, setSubmitting] = useState(false)
  const [payingOnline, setPayingOnline] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<'' | BillCategory>('')
  // Set only when Collect Payment was auto-opened right after creating a bill (the guided registration ->
  // appointment -> bill -> payment flow) - NOT when collecting on an existing row from the pending-bills
  // queue below, so working through that queue doesn't get interrupted by a redirect after every payment.
  const [justCreatedFlow, setJustCreatedFlow] = useState(false)

  useEffect(() => { dispatch(fetchPendingBills(categoryFilter || undefined)) }, [dispatch, categoryFilter])
  useEffect(() => { dispatch(fetchPatients({ pageSize: 100 })) }, [dispatch])
  useEffect(() => { dispatch(fetchActiveAdmissions()) }, [dispatch])

  // The patient's own currently-active admission(s), for the IPD admission picker below.
  const patientActiveAdmissions = activeAdmissions.filter((a) => a.patientId === patientId)

  const addItem = () => setItems((i) => [...i, { description: '', quantity: 1, unitPrice: 0 }])
  const updateItem = (index: number, patch: Partial<LineItem>) => setItems((i) => i.map((line, idx) => (idx === index ? { ...line, ...patch } : line)))
  const removeItem = (index: number) => setItems((i) => i.filter((_, idx) => idx !== index))
  const subTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)

  const handleCreateBill = async () => {
    if (!patientId || items.every((i) => !i.description)) return
    if (billCategory === 'IPD' && !ipdAdmissionId) return
    setSubmitting(true)
    try {
      const bill = await dispatch(createBill({
        patientId,
        ipdAdmissionId: billCategory === 'IPD' ? Number(ipdAdmissionId) : undefined,
        type: billType,
        items: items.filter((i) => i.description),
        discountAmount: discount,
        gstPercent: gst,
        branchId: user?.branchId ?? 1,
      }))
      toast.success(`Bill ${bill.billNumber} created for ₹${bill.totalAmount}`)
      setCreateOpen(false)
      setItems([{ description: '', quantity: 1, unitPrice: 0 }]); setPatientId(''); setDiscount(0)
      setBillCategory('OPD'); setIpdAdmissionId('')
      dispatch(fetchPendingBills(categoryFilter || undefined))
      // A freshly-created bill is almost always paid on the spot - open Collect Payment for it immediately
      // instead of leaving the receptionist to find it in the pending list.
      setJustCreatedFlow(true)
      setPayTarget(bill)
      setPayAmount(bill.totalAmount - bill.paidAmount)
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
      dispatch(fetchPendingBills(categoryFilter || undefined))
      if (justCreatedFlow) {
        setJustCreatedFlow(false)
        // Closes the registration -> appointment -> bill -> payment loop by landing back on the dashboard,
        // where Today's Revenue now reflects what was just collected.
        navigate('/app/dashboard')
      }
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
      dispatch(fetchPendingBills(categoryFilter || undefined))
      if (justCreatedFlow) {
        setJustCreatedFlow(false)
        navigate('/app/dashboard')
      }
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
    { key: 'category', header: 'OPD/IPD', render: (b) => <Badge tone={b.category === 'IPD' ? 'warning' : 'brand'}>{b.category}</Badge> },
    { key: 'type', header: 'Type', render: (b) => <Badge tone="neutral">{b.type}</Badge> },
    { key: 'total', header: 'Total', render: (b) => `₹${b.totalAmount.toLocaleString('en-IN')}` },
    { key: 'paid', header: 'Paid', render: (b) => `₹${b.paidAmount.toLocaleString('en-IN')}` },
    { key: 'status', header: 'Status', render: (b) => <Badge>{b.status}</Badge> },
    {
      key: 'actions', header: '', render: (b) => (
        <div className="flex gap-3">
          <button onClick={() => { setJustCreatedFlow(false); setPayTarget(b); setPayAmount(b.totalAmount - b.paidAmount) }} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <Receipt size={16} /> Pending &amp; Partially Paid Bills
          </div>
          <Select label="" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as '' | BillCategory)} className="w-40">
            <option value="">All (OPD + IPD)</option>
            <option value="OPD">OPD only</option>
            <option value="IPD">IPD only</option>
          </Select>
        </div>
        <div className="p-4">
          <Table columns={columns} rows={pending} keyField={(b) => b.id} loading={status === 'loading'} emptyMessage="No pending bills." />
        </div>
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Bill" widthClassName="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Patient" value={patientId} onChange={(e) => { setPatientId(Number(e.target.value) || ''); setIpdAdmissionId('') }}>
              <option value="">Select patient</option>
              {patients?.items.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
            </Select>
            <Select label="Bill type" value={billType} onChange={(e) => setBillType(e.target.value)}>
              {['Consultation', 'Admission', 'Lab', 'Pharmacy', 'Operation', 'Room', 'Nursing'].map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Bill for"
              hint="OPD = outpatient/walk-in charge. IPD = charged against an active admission."
              value={billCategory}
              onChange={(e) => { setBillCategory(e.target.value as BillCategory); setIpdAdmissionId('') }}
            >
              <option value="OPD">OPD (Outpatient)</option>
              <option value="IPD">IPD (Inpatient / Admission)</option>
            </Select>
            {billCategory === 'IPD' && (
              <Select
                label="IPD admission"
                value={ipdAdmissionId}
                onChange={(e) => setIpdAdmissionId(Number(e.target.value) || '')}
                hint={patientId && patientActiveAdmissions.length === 0 ? 'This patient has no active admission.' : undefined}
              >
                <option value="">Select admission</option>
                {patientActiveAdmissions.map((a) => (
                  <option key={a.id} value={a.id}>{a.admissionNumber} · Bed {a.bedNumber} · {admissionTypeLabel(a.admissionType)}</option>
                ))}
              </Select>
            )}
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
            <Button loading={submitting} disabled={!patientId || (billCategory === 'IPD' && !ipdAdmissionId)} onClick={handleCreateBill}>Create Bill</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!payTarget} onClose={() => { setPayTarget(null); setJustCreatedFlow(false) }} title="Collect Payment">
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
              <Button variant="secondary" onClick={() => { setPayTarget(null); setJustCreatedFlow(false) }}>Cancel</Button>
              <Button variant="success" loading={submitting} onClick={handleCollectPayment}>Collect Payment</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
