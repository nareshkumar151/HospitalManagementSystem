import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Wallet } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { payrollResource, type PayrollRow } from '../../features/generic/resources'
import { fetchEmployees } from '../../features/employees/employeesSlice'
import { apiClient, extractErrorMessage } from '../../api/client'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { SearchBox, PaginationBar } from '../../components/ui/ListToolbar'

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function PayrollPage() {
  const dispatch = useAppDispatch()
  const { list, status } = useAppSelector((state) => state.payroll)
  const { list: employees } = useAppSelector((state) => state.employees)
  const items = list?.items ?? []

  const [period, setPeriod] = useState(currentPeriod())
  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [bonus, setBonus] = useState(0)
  const [tax, setTax] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const refresh = (p: string) => dispatch(payrollResource.fetchPage({ pageNumber: page, pageSize: 10, search }, `/payroll/period/${p}`))
  useEffect(() => {
    const timeout = setTimeout(() => refresh(period), 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, period, page, search])
  useEffect(() => { dispatch(fetchEmployees({ pageSize: 100 })) }, [dispatch])

  const generate = async () => {
    if (!employeeId) return
    setGenerating(true)
    try {
      await apiClient.post('/payroll', { employeeId, payPeriod: period, bonus, taxDeduction: tax })
      toast.success('Payroll generated.')
      refresh(period)
      setEmployeeId(''); setBonus(0); setTax(0)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setGenerating(false)
    }
  }

  const columns: Column<PayrollRow>[] = [
    { key: 'employee', header: 'Employee', render: (p) => p.employeeName },
    { key: 'basic', header: 'Basic', render: (p) => `₹${p.basicSalary.toLocaleString('en-IN')}` },
    { key: 'pf', header: 'PF', render: (p) => `₹${p.pf}` },
    { key: 'esi', header: 'ESI', render: (p) => `₹${p.esi}` },
    { key: 'tax', header: 'Tax', render: (p) => `₹${p.taxDeduction}` },
    { key: 'bonus', header: 'Bonus', render: (p) => `₹${p.bonus}` },
    { key: 'net', header: 'Net Salary', render: (p) => <span className="font-semibold text-ink-900">₹{p.netSalary.toLocaleString('en-IN')}</span> },
  ]

  return (
    <div>
      <PageHeader title="Payroll" subtitle="Generate monthly payslips with statutory PF/ESI deductions." />

      <Card className="mb-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><Wallet size={16} /> Generate Payslip</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <Select label="Employee" value={employeeId} onChange={(e) => setEmployeeId(Number(e.target.value) || '')}>
            <option value="">Select employee</option>
            {employees?.items.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </Select>
          <Input label="Pay period" type="month" value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1) }} />
          <Input label="Bonus" type="number" value={bonus} onChange={(e) => setBonus(Number(e.target.value))} />
          <Input label="Tax deduction" type="number" value={tax} onChange={(e) => setTax(Number(e.target.value))} />
          <div className="flex items-end"><Button className="w-full" loading={generating} disabled={!employeeId} onClick={generate}>Generate</Button></div>
        </div>
      </Card>

      <Card padded={false}>
        <div className="flex items-center justify-end border-b border-ink-100 p-4">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by employee…" />
        </div>
        <div className="p-4">
          <Table columns={columns} rows={items} keyField={(p) => p.id} loading={status === 'loading'} emptyMessage={`No payslips generated for ${period} yet.`} />
        </div>
        {list && <PaginationBar pageNumber={list.pageNumber} totalPages={list.totalPages} totalCount={list.totalCount} onPageChange={setPage} />}
      </Card>
    </div>
  )
}
