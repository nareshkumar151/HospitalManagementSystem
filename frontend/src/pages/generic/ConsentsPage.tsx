import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FileSignature, Plus, ShieldCheck, Users } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { fetchPatients } from '../../features/patients/patientsSlice'
import { fetchPatientConsents, captureConsent } from '../../features/consents/consentsSlice'
import { consentTemplateResource } from '../../features/generic/resources'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { SearchBox } from '../../components/ui/ListToolbar'
import { HandwritingField, isHandwritingCapture } from '../../components/clinical/HandwritingField'
import { downloadFile, extractErrorMessage } from '../../api/client'
import type { ConsentContext, ConsentDecision, ConsentRecordDto, ConsentTemplateDto } from '../../types'

const CONTEXTS: ConsentContext[] = ['Registration', 'OPD', 'IPD', 'Surgery']
const RELATIONS = ['Self', 'Spouse', 'Parent', 'Child', 'Guardian', 'Other']

export function ConsentsPage() {
  const dispatch = useAppDispatch()
  const role = useAppSelector((state) => state.auth.user?.role)
  const isAdmin = role === 'SuperAdmin' || role === 'Administrator'

  const { list: patientList } = useAppSelector((state) => state.patients)
  const { items: templates } = useAppSelector((state) => state.consentTemplates)
  const { patientHistory, status: historyStatus } = useAppSelector((state) => state.consents)

  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<{ id: number; fullName: string } | null>(null)

  const [templateId, setTemplateId] = useState<number | ''>('')
  const [context, setContext] = useState<ConsentContext>('Registration')
  const [procedureName, setProcedureName] = useState('')
  const [decision, setDecision] = useState<ConsentDecision>('Accepted')
  const [signedByName, setSignedByName] = useState('')
  const [relationToPatient, setRelationToPatient] = useState('Self')
  const [witnessName, setWitnessName] = useState('')
  const [refusalReason, setRefusalReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Forces HandwritingField to remount (and re-default its type/stylus toggle) whenever the signer's name
  // is reset to plain text - otherwise it could stay stuck showing an empty drawing pad from the previous
  // patient/submission instead of falling back to a text field.
  const [signatureFieldKey, setSignatureFieldKey] = useState(0)

  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [templateCode, setTemplateCode] = useState('')
  const [templateTitle, setTemplateTitle] = useState('')
  const [templateCategory, setTemplateCategory] = useState('Procedure')
  const [templateBody, setTemplateBody] = useState('')

  useEffect(() => { dispatch(consentTemplateResource.fetchAll({ includeInactive: isAdmin })) }, [dispatch, isAdmin])

  useEffect(() => {
    const handle = setTimeout(() => {
      if (patientSearch.trim().length >= 2) dispatch(fetchPatients({ pageNumber: 1, pageSize: 6, search: patientSearch }))
    }, 300)
    return () => clearTimeout(handle)
  }, [dispatch, patientSearch])

  useEffect(() => {
    if (selectedPatient) {
      dispatch(fetchPatientConsents(selectedPatient.id))
      setSignedByName(selectedPatient.fullName)
      setSignatureFieldKey((k) => k + 1)
    }
  }, [dispatch, selectedPatient])

  const selectedTemplate = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId])

  const resetCaptureForm = () => {
    setTemplateId(''); setContext('Registration'); setProcedureName(''); setDecision('Accepted')
    setRelationToPatient('Self'); setWitnessName(''); setRefusalReason(''); setNotes('')
    // Back to the patient's own name - the form default for "Self"; staff overtypes it (or has them sign
    // again with the stylus) for a guardian.
    setSignedByName(selectedPatient?.fullName ?? '')
    setSignatureFieldKey((k) => k + 1)
  }

  const handleCapture = async () => {
    if (!selectedPatient || !templateId || !signedByName.trim()) {
      toast.error('Select a patient, a consent template, and enter the signer’s name.')
      return
    }
    if (decision === 'Refused' && !refusalReason.trim()) {
      toast.error('Enter a reason for refusal.')
      return
    }
    setSubmitting(true)
    try {
      await dispatch(captureConsent({
        patientId: selectedPatient.id,
        templateId,
        context,
        procedureName: selectedTemplate?.category === 'Procedure' ? procedureName || undefined : undefined,
        decision,
        signedByName: signedByName.trim(),
        relationToPatient,
        witnessName: witnessName || undefined,
        refusalReason: decision === 'Refused' ? refusalReason : undefined,
        notes: notes || undefined,
      }))
      toast.success('Consent recorded.')
      resetCaptureForm()
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!templateCode.trim() || !templateTitle.trim() || !templateBody.trim()) {
      toast.error('Code, title and body text are required.')
      return
    }
    try {
      await dispatch(consentTemplateResource.create(
        { code: templateCode.trim().toUpperCase().replace(/\s+/g, '_'), title: templateTitle, category: templateCategory, bodyText: templateBody },
        { includeInactive: true },
      ))
      toast.success('Template created.')
      setTemplateModalOpen(false)
      setTemplateCode(''); setTemplateTitle(''); setTemplateBody('')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const toggleTemplateActive = async (template: ConsentTemplateDto) => {
    try {
      await dispatch(consentTemplateResource.update(
        template.id,
        { title: template.title, bodyText: template.bodyText, isActive: !template.isActive },
        { includeInactive: true },
      ))
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const historyColumns: Column<ConsentRecordDto>[] = [
    { key: 'signedAt', header: 'Date', render: (c) => new Date(c.signedAt).toLocaleString() },
    { key: 'template', header: 'Consent', render: (c) => <>{c.templateTitle}{c.procedureName && <span className="block text-xs text-ink-500">{c.procedureName}</span>}</> },
    { key: 'context', header: 'Context', render: (c) => c.context },
    { key: 'decision', header: 'Decision', render: (c) => <Badge>{c.decision}</Badge> },
    {
      key: 'signedBy', header: 'Signed by', render: (c) => (
        <>
          {isHandwritingCapture(c.signedByName)
            ? <img src={c.signedByName} alt="Signature" className="h-10 max-w-[140px] rounded border border-ink-100 bg-white object-contain" />
            : c.signedByName}
          {c.relationToPatient && <span className="block text-xs text-ink-500">{c.relationToPatient}</span>}
        </>
      ),
    },
    { key: 'witness', header: 'Witness', render: (c) => c.witnessName || c.witnessUserName || '—' },
    { key: 'details', header: 'Details', render: (c) => (c.decision === 'Refused' ? c.refusalReason : c.notes) || '—' },
    { key: 'recordedBy', header: 'Recorded by', render: (c) => c.recordedByName },
    {
      key: 'download', header: '', render: (c) => (
        <button
          onClick={() => downloadFile(`/consents/${c.id}/pdf`, `Consent-${c.id}.pdf`).catch(() => toast.error('Could not download the PDF.'))}
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          Download
        </button>
      ),
    },
  ]

  const templateColumns: Column<ConsentTemplateDto>[] = [
    { key: 'title', header: 'Title', render: (t) => <>{t.title}<span className="block text-xs text-ink-500">{t.code}</span></> },
    { key: 'category', header: 'Category', render: (t) => t.category },
    { key: 'status', header: 'Status', render: (t) => <Badge tone={t.isActive ? 'success' : 'neutral'}>{t.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'actions', header: '', render: (t) => (
        <button onClick={() => toggleTemplateActive(t)} className="text-xs font-medium text-brand-600 hover:underline">
          {t.isActive ? 'Deactivate' : 'Activate'}
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Consents" subtitle="Capture and review signed/refused patient consent forms." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><Users size={16} /> Select Patient</h3>
          <SearchBox value={patientSearch} onChange={setPatientSearch} placeholder="Search by name or UHID…" className="w-full" />
          <div className="mt-2 space-y-1">
            {(patientList?.items ?? []).map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedPatient({ id: p.id, fullName: p.fullName }); setPatientSearch('') }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted"
              >
                {p.fullName} <span className="text-xs text-ink-500">· {p.uhid}</span>
              </button>
            ))}
          </div>
          {selectedPatient && (
            <div className="mt-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
              Selected: <strong>{selectedPatient.fullName}</strong>
              <button className="ml-2 text-xs underline" onClick={() => setSelectedPatient(null)}>change</button>
            </div>
          )}

          {selectedPatient && (
            <div className="mt-5 space-y-3 border-t border-ink-100 pt-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-ink-900"><FileSignature size={16} /> Capture Consent</h4>
              <Select label="Consent template" value={templateId} onChange={(e) => setTemplateId(Number(e.target.value) || '')}>
                <option value="">Select a template</option>
                {templates.filter((t) => t.isActive).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </Select>
              {selectedTemplate && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-ink-100 bg-surface-muted p-3 text-xs leading-relaxed text-ink-700 whitespace-pre-line">
                  {selectedTemplate.bodyText}
                </div>
              )}
              {selectedTemplate?.category === 'Procedure' && (
                <Input label="Procedure name" placeholder="e.g. URSL, Circumcision" value={procedureName} onChange={(e) => setProcedureName(e.target.value)} />
              )}
              <Select label="Context" value={context} onChange={(e) => setContext(e.target.value as ConsentContext)}>
                {CONTEXTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Select label="Decision" value={decision} onChange={(e) => setDecision(e.target.value as ConsentDecision)}>
                  <option value="Accepted">Accepted</option>
                  <option value="Refused">Refused</option>
                </Select>
                <Select label="Relation to patient" value={relationToPatient} onChange={(e) => setRelationToPatient(e.target.value)}>
                  {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
              </div>
              <HandwritingField
                key={signatureFieldKey}
                label="Signed by (name or signature)"
                value={signedByName}
                onChange={setSignedByName}
                padHeight={140}
                required
              />
              <Input label="Witness name (optional)" value={witnessName} onChange={(e) => setWitnessName(e.target.value)} />
              {decision === 'Refused' && (
                <Input label="Reason for refusal" value={refusalReason} onChange={(e) => setRefusalReason(e.target.value)} />
              )}
              <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button className="w-full" loading={submitting} onClick={handleCapture}>Record Consent</Button>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2" padded={false}>
          <div className="flex items-center gap-2 border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
            <ShieldCheck size={16} /> {selectedPatient ? `${selectedPatient.fullName}'s Consent History` : 'Consent History'}
          </div>
          <div className="p-4">
            {selectedPatient ? (
              <Table columns={historyColumns} rows={patientHistory} keyField={(c) => c.id} loading={historyStatus === 'loading'} emptyMessage="No consents recorded for this patient yet." />
            ) : (
              <p className="py-10 text-center text-sm text-ink-500">Select a patient to view or capture consent forms.</p>
            )}
          </div>
        </Card>
      </div>

      {isAdmin && (
        <Card className="mt-4" padded={false}>
          <div className="flex items-center justify-between border-b border-ink-100 p-4 text-sm font-medium text-ink-700">
            <span>Manage Consent Templates</span>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setTemplateModalOpen(true)}>Add Template</Button>
          </div>
          <div className="p-4">
            <Table columns={templateColumns} rows={templates} keyField={(t) => t.id} emptyMessage="No templates yet." />
          </div>
        </Card>
      )}

      <Modal open={templateModalOpen} onClose={() => setTemplateModalOpen(false)} title="Add Consent Template">
        <div className="space-y-3">
          <Input label="Code" placeholder="e.g. CYSTOSCOPY_CONSENT" value={templateCode} onChange={(e) => setTemplateCode(e.target.value)} />
          <Input label="Title" value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} />
          <Select label="Category" value={templateCategory} onChange={(e) => setTemplateCategory(e.target.value)}>
            {['Registration', 'Surgery', 'Anesthesia', 'Transfusion', 'LAMA', 'Procedure'].map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Consent text</span>
            <textarea
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-ink-100 bg-surface px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate}>Save Template</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
